import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Router } from "express";
import {
  query,
  nextCode,
  logActivity,
  addNotification,
  expireOldPermits,
} from "./db.js";
import { asyncH, requireAuth, requireRoles, publicUser } from "./middleware.js";

const router = Router();

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "12h" });
}

router.post(
  "/auth/login",
  asyncH(async (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const { rows } = await query("SELECT * FROM users WHERE LOWER(email) = $1", [email]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    if (user.status !== "Active") {
      return res.status(403).json({ error: "This account is inactive" });
    }
    await query("UPDATE users SET last_login = NOW() WHERE id = $1", [user.id]);
    await logActivity(user, "Signed in");
    res.json({ token: signToken(user), user: publicUser(user) });
  })
);

router.get(
  "/auth/me",
  requireAuth,
  asyncH(async (req, res) => {
    res.json({ user: req.user });
  })
);

router.get(
  "/public/permits/:number",
  asyncH(async (req, res) => {
    const { rows } = await query(
      `SELECT p.permit_number, p.status, p.permit_type, p.boat_type, p.fishing_method,
              p.issue_date, p.expiry_date, f.name, f.barangay, f.public_id
       FROM permits p JOIN fisherfolk f ON f.id = p.fisherfolk_id
       WHERE p.permit_number = $1`,
      [req.params.number]
    );
    if (!rows[0]) return res.status(404).json({ error: "Permit not found" });
    res.json(rows[0]);
  })
);

router.use(requireAuth);

router.get(
  "/dashboard",
  asyncH(async (req, res) => {
    await expireOldPermits();
    const stats = await query(`
      SELECT
        (SELECT COUNT(*)::int FROM fisherfolk WHERE archived = FALSE) AS fisherfolk,
        (SELECT COUNT(*)::int FROM permits WHERE status IN ('Active','Approved','Released')) AS active_permits,
        (SELECT COUNT(*)::int FROM permits WHERE status = 'Expired') AS expired_permits,
        (SELECT COUNT(*)::int FROM permits WHERE status IN ('Pending','Verified')) AS pending_applications,
        (SELECT COUNT(DISTINCT fisherfolk_id)::int FROM boats) AS boat_owners
    `);
    const recent = await query(`
      SELECT pay.public_id AS id, pay.fisherfolk_name AS name, pay.barangay, pay.permit_type AS type,
             pay.status, to_char(pay.paid_at, 'YYYY-MM-DD') AS date, pay.amount
      FROM payments pay
      ORDER BY pay.created_at DESC
      LIMIT 8
    `);
    const statusDist = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('Active','Approved','Released'))::int AS active,
        COUNT(*) FILTER (WHERE status = 'Expired')::int AS expired,
        COUNT(*) FILTER (WHERE status IN ('Pending','Verified'))::int AS pending
      FROM permits
    `);
    const monthly = await query(`
      SELECT to_char(d, 'Mon') AS month,
        (SELECT COUNT(*)::int FROM permits p
          WHERE date_trunc('month', COALESCE(p.issue_date, p.created_at)) = d
            AND p.permit_type = 'New Application') AS permits,
        (SELECT COUNT(*)::int FROM permits p
          WHERE date_trunc('month', COALESCE(p.issue_date, p.created_at)) = d
            AND p.permit_type = 'Renewal') AS renewals
      FROM generate_series(date_trunc('month', CURRENT_DATE) - INTERVAL '4 months', date_trunc('month', CURRENT_DATE), '1 month') d
    `);
    res.json({
      stats: stats.rows[0],
      recent: recent.rows,
      statusDistribution: statusDist.rows[0],
      monthly: monthly.rows,
    });
  })
);

router.get(
  "/fisherfolk",
  asyncH(async (req, res) => {
    const { search = "", barangay = "", status = "", boatType = "", archived = "false" } = req.query;
    const params = [];
    const where = [`f.archived = $${params.push(archived === "true")}`];
    if (search) {
      params.push(`%${search}%`);
      where.push(`(f.name ILIKE $${params.length} OR f.public_id ILIKE $${params.length} OR f.contact ILIKE $${params.length})`);
    }
    if (barangay && barangay !== "All Barangays") {
      params.push(barangay);
      where.push(`f.barangay = $${params.length}`);
    }
    if (boatType && boatType !== "All Boat Types") {
      params.push(boatType);
      where.push(`EXISTS (SELECT 1 FROM boats b WHERE b.fisherfolk_id = f.id AND b.boat_type = $${params.length})`);
    }
    const { rows } = await query(
      `SELECT f.*,
              (SELECT COUNT(*)::int FROM boats b WHERE b.fisherfolk_id = f.id) AS boats,
              (SELECT b.boat_type FROM boats b WHERE b.fisherfolk_id = f.id ORDER BY b.id LIMIT 1) AS boat_type,
              COALESCE((
                SELECT CASE
                  WHEN COUNT(*) FILTER (WHERE p.status IN ('Active','Approved','Released')) > 0 THEN 'Active'
                  WHEN COUNT(*) FILTER (WHERE p.status IN ('Pending','Verified')) > 0 THEN 'Pending'
                  WHEN COUNT(*) FILTER (WHERE p.status = 'Expired') > 0 THEN 'Expired'
                  ELSE 'None'
                END
                FROM permits p WHERE p.fisherfolk_id = f.id
              ), 'None') AS permit_status
       FROM fisherfolk f
       WHERE ${where.join(" AND ")}
       ORDER BY f.created_at DESC`,
      params
    );
    const filtered =
      status && status !== "All Status" ? rows.filter((r) => r.permit_status === status) : rows;
    res.json(filtered);
  })
);

router.get(
  "/fisherfolk/:id",
  asyncH(async (req, res) => {
    const { rows } = await query("SELECT * FROM fisherfolk WHERE id = $1", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Fisherfolk not found" });
    const boats = await query("SELECT * FROM boats WHERE fisherfolk_id = $1 ORDER BY id", [req.params.id]);
    const permits = await query(
      "SELECT * FROM permits WHERE fisherfolk_id = $1 ORDER BY created_at DESC",
      [req.params.id]
    );
    res.json({ ...rows[0], boats: boats.rows, permits: permits.rows });
  })
);

router.post(
  "/fisherfolk",
  requireRoles("Head Admin", "Staff"),
  asyncH(async (req, res) => {
    const { name, barangay, contact } = req.body;
    if (!name || !barangay || !contact) {
      return res.status(400).json({ error: "Name, barangay, and contact are required" });
    }
    const publicId = await nextCode("FF", "fisherfolk", "public_id");
    const { rows } = await query(
      `INSERT INTO fisherfolk (public_id, name, barangay, contact)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [publicId, name, barangay, contact]
    );
    await logActivity(req.user, `Registered fisherfolk ${publicId} (${name})`);
    res.status(201).json(rows[0]);
  })
);

router.patch(
  "/fisherfolk/:id",
  requireRoles("Head Admin", "Staff"),
  asyncH(async (req, res) => {
    const { name, barangay, contact, archived } = req.body;
    const { rows } = await query(
      `UPDATE fisherfolk SET
         name = COALESCE($1, name),
         barangay = COALESCE($2, barangay),
         contact = COALESCE($3, contact),
         archived = COALESCE($4, archived)
       WHERE id = $5 RETURNING *`,
      [name || null, barangay || null, contact || null, typeof archived === "boolean" ? archived : null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Fisherfolk not found" });
    await logActivity(req.user, `Updated fisherfolk ${rows[0].public_id}`);
    res.json(rows[0]);
  })
);

router.get(
  "/permits",
  asyncH(async (req, res) => {
    await expireOldPermits();
    const { search = "", barangay = "", status = "", archived = "false" } = req.query;
    const params = [];
    const where = [`f.archived = $${params.push(archived === "true")}`];
    if (search) {
      params.push(`%${search}%`);
      where.push(`(f.name ILIKE $${params.length} OR p.permit_number ILIKE $${params.length})`);
    }
    if (barangay && barangay !== "All Barangays") {
      params.push(barangay);
      where.push(`f.barangay = $${params.length}`);
    }
    if (status && status !== "All Status") {
      params.push(status);
      where.push(`p.status = $${params.length}`);
    }
    const { rows } = await query(
      `SELECT p.*, f.name AS owner_name, f.barangay, f.public_id AS fisherfolk_public_id, f.contact
       FROM permits p
       JOIN fisherfolk f ON f.id = p.fisherfolk_id
       WHERE ${where.join(" AND ")}
       ORDER BY p.created_at DESC`,
      params
    );
    res.json(rows);
  })
);

router.post(
  "/permits",
  requireRoles("Head Admin", "Staff"),
  asyncH(async (req, res) => {
    const {
      fisherfolkId,
      fisherfolkName,
      barangay,
      contact,
      boatType,
      fishingMethod,
      permitType,
      documents = [],
    } = req.body;
    if (!fisherfolkName || !barangay || !contact || !boatType || !fishingMethod || !permitType) {
      return res.status(400).json({ error: "Complete all required permit fields" });
    }

    let ffId = fisherfolkId;
    if (ffId) {
      await query(
        "UPDATE fisherfolk SET name = $1, barangay = $2, contact = $3 WHERE id = $4",
        [fisherfolkName, barangay, contact, ffId]
      );
    } else {
      const publicId = await nextCode("FF", "fisherfolk", "public_id");
      const created = await query(
        `INSERT INTO fisherfolk (public_id, name, barangay, contact)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [publicId, fisherfolkName, barangay, contact]
      );
      ffId = created.rows[0].id;
    }

    const boat = await query(
      `INSERT INTO boats (fisherfolk_id, boat_type, fishing_method)
       VALUES ($1, $2, $3) RETURNING id`,
      [ffId, boatType, fishingMethod]
    );
    const permitNumber = await nextCode("PERMIT", "permits", "permit_number");
    const issueDate = new Date();
    const expiry = new Date(issueDate);
    expiry.setFullYear(expiry.getFullYear() + 1);
    const { rows } = await query(
      `INSERT INTO permits (
         permit_number, fisherfolk_id, boat_id, permit_type, boat_type, fishing_method,
         status, issue_date, expiry_date, documents, created_by
       ) VALUES ($1,$2,$3,$4,$5,$6,'Pending',$7,$8,$9,$10)
       RETURNING *`,
      [
        permitNumber,
        ffId,
        boat.rows[0].id,
        permitType,
        boatType,
        fishingMethod,
        issueDate.toISOString().slice(0, 10),
        expiry.toISOString().slice(0, 10),
        documents,
        req.user.id,
      ]
    );
    await addNotification("application", "New Permit Application", `${fisherfolkName} submitted ${permitType} (${permitNumber})`);
    await logActivity(req.user, `Created ${permitType} ${permitNumber} for ${fisherfolkName}`);
    res.status(201).json(rows[0]);
  })
);

router.patch(
  "/permits/:id",
  requireRoles("Head Admin", "Staff"),
  asyncH(async (req, res) => {
    const { status } = req.body;
    const allowed = ["Pending", "Verified", "Approved", "Active", "Released", "Expired"];
    if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status" });
    const { rows } = await query(
      "UPDATE permits SET status = $1 WHERE id = $2 RETURNING *",
      [status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Permit not found" });
    await logActivity(req.user, `Set ${rows[0].permit_number} status to ${status}`);
    res.json(rows[0]);
  })
);

router.get(
  "/payments",
  asyncH(async (req, res) => {
    const { search = "", status = "" } = req.query;
    const params = [];
    const where = ["TRUE"];
    if (search) {
      params.push(`%${search}%`);
      where.push(
        `(fisherfolk_name ILIKE $${params.length} OR permit_number ILIKE $${params.length} OR public_id ILIKE $${params.length})`
      );
    }
    if (status && status !== "All Status") {
      params.push(status);
      where.push(`status = $${params.length}`);
    }
    const list = await query(
      `SELECT * FROM payments WHERE ${where.join(" AND ")} ORDER BY created_at DESC`,
      params
    );
    const summary = await query(`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE status = 'Fully Paid'), 0)::float AS collected,
        COUNT(*) FILTER (WHERE status = 'Pending')::int AS pending_count,
        COALESCE(SUM(amount) FILTER (WHERE status = 'Fully Paid' AND payment_method = 'Cash'), 0)::float AS cash,
        COALESCE(SUM(amount) FILTER (WHERE status = 'Fully Paid' AND payment_method = 'Online'), 0)::float AS online
      FROM payments
    `);
    res.json({ records: list.rows, summary: summary.rows[0] });
  })
);

router.post(
  "/payments",
  requireRoles("Head Admin", "Staff", "Cashier"),
  asyncH(async (req, res) => {
    const {
      permitNumber,
      fisherfolkName,
      permitType,
      amount,
      paymentMethod,
      orNumber,
      referenceNumber,
      cashier,
      status = "Fully Paid",
    } = req.body;
    if (!permitNumber || !fisherfolkName || !amount || !paymentMethod) {
      return res.status(400).json({ error: "Permit number, name, amount, and method are required" });
    }
    const permit = await query(
      `SELECT p.id, f.barangay FROM permits p
       JOIN fisherfolk f ON f.id = p.fisherfolk_id
       WHERE p.permit_number = $1`,
      [permitNumber]
    );
    const publicId = await nextCode("PAY", "payments", "public_id");
    const { rows } = await query(
      `INSERT INTO payments (
         public_id, permit_id, permit_number, fisherfolk_name, barangay, permit_type,
         amount, payment_method, or_number, reference_number, status, cashier
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        publicId,
        permit.rows[0]?.id || null,
        permitNumber,
        fisherfolkName,
        permit.rows[0]?.barangay || null,
        permitType,
        amount,
        paymentMethod,
        orNumber || null,
        referenceNumber || null,
        status,
        cashier || req.user.name,
      ]
    );
    if (status === "Fully Paid" && permit.rows[0]) {
      await query("UPDATE permits SET status = 'Active' WHERE id = $1 AND status IN ('Pending','Verified','Approved')", [
        permit.rows[0].id,
      ]);
    }
    await addNotification("payment", "Payment Recorded", `${publicId} recorded for ${permitNumber}`);
    await logActivity(req.user, `Recorded payment ${publicId} for ${permitNumber}`);
    res.status(201).json(rows[0]);
  })
);

router.get(
  "/users",
  requireRoles("Head Admin"),
  asyncH(async (req, res) => {
    const { search = "" } = req.query;
    const { rows } = await query(
      `SELECT id, name, email, role, status, last_login, created_at
       FROM users
       WHERE name ILIKE $1 OR email ILIKE $1
       ORDER BY id`,
      [`%${search}%`]
    );
    res.json(rows);
  })
);

router.post(
  "/users",
  requireRoles("Head Admin"),
  asyncH(async (req, res) => {
    const { name, email, role, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }
    const hash = await bcrypt.hash(password, 10);
    try {
      const { rows } = await query(
        `INSERT INTO users (name, email, password_hash, role, status)
         VALUES ($1, $2, $3, $4, 'Active') RETURNING id, name, email, role, status, last_login`,
        [name, String(email).toLowerCase(), hash, role || "Staff"]
      );
      await logActivity(req.user, `Created user ${email}`);
      res.status(201).json(rows[0]);
    } catch (err) {
      if (err.code === "23505") return res.status(409).json({ error: "Email already exists" });
      throw err;
    }
  })
);

router.patch(
  "/users/:id",
  requireRoles("Head Admin"),
  asyncH(async (req, res) => {
    const { name, role, status, password } = req.body;
    const hash = password ? await bcrypt.hash(password, 10) : null;
    const { rows } = await query(
      `UPDATE users SET
         name = COALESCE($1, name),
         role = COALESCE($2, role),
         status = COALESCE($3, status),
         password_hash = COALESCE($4, password_hash)
       WHERE id = $5
       RETURNING id, name, email, role, status, last_login`,
      [name || null, role || null, status || null, hash, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "User not found" });
    await logActivity(req.user, `Updated user ${rows[0].email}`);
    res.json(rows[0]);
  })
);

router.delete(
  "/users/:id",
  requireRoles("Head Admin"),
  asyncH(async (req, res) => {
    if (Number(req.params.id) === req.user.id) {
      return res.status(400).json({ error: "You cannot delete your own account" });
    }
    const { rowCount } = await query("DELETE FROM users WHERE id = $1", [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: "User not found" });
    await logActivity(req.user, `Deleted user #${req.params.id}`);
    res.json({ ok: true });
  })
);

router.get(
  "/notifications",
  asyncH(async (req, res) => {
    const notes = await query("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50");
    const logs = await query("SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 30");
    const unread = await query("SELECT COUNT(*)::int AS n FROM notifications WHERE is_read = FALSE");
    const expiring = await query(`
      SELECT COUNT(*)::int AS n FROM permits
      WHERE status IN ('Active','Approved','Released')
        AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
    `);
    const pending = await query(`
      SELECT COUNT(*)::int AS n FROM permits WHERE status IN ('Pending','Verified')
    `);
    res.json({
      notifications: notes.rows,
      activity: logs.rows,
      unread: unread.rows[0].n,
      expiring: expiring.rows[0].n,
      pending: pending.rows[0].n,
    });
  })
);

router.post(
  "/notifications/read-all",
  asyncH(async (req, res) => {
    await query("UPDATE notifications SET is_read = TRUE");
    res.json({ ok: true });
  })
);

router.patch(
  "/notifications/:id/read",
  asyncH(async (req, res) => {
    await query("UPDATE notifications SET is_read = TRUE WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  })
);

router.delete(
  "/notifications/:id",
  asyncH(async (req, res) => {
    await query("DELETE FROM notifications WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  })
);

router.get(
  "/settings",
  asyncH(async (req, res) => {
    const { rows } = await query("SELECT key, value FROM settings");
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    res.json(map);
  })
);

router.put(
  "/settings",
  requireRoles("Head Admin"),
  asyncH(async (req, res) => {
    const entries = Object.entries(req.body || {});
    for (const [key, value] of entries) {
      await query(
        `INSERT INTO settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, value]
      );
    }
    await logActivity(req.user, "Updated system settings");
    const { rows } = await query("SELECT key, value FROM settings");
    res.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
  })
);

router.get(
  "/reports",
  asyncH(async (req, res) => {
    await expireOldPermits();
    const barangay = req.query.barangay || "All Barangays";
    const params = [];
    const barangayFilter = barangay !== "All Barangays" ? (params.push(barangay), "AND f.barangay = $1") : "";

    const monthly = await query(
      `SELECT to_char(d, 'Mon') AS month,
        (SELECT COUNT(*)::int FROM permits p JOIN fisherfolk f ON f.id = p.fisherfolk_id
          WHERE date_trunc('month', COALESCE(p.issue_date, p.created_at)) = d
            AND p.permit_type = 'New Application' ${barangayFilter}) AS permits,
        (SELECT COUNT(*)::int FROM permits p JOIN fisherfolk f ON f.id = p.fisherfolk_id
          WHERE date_trunc('month', COALESCE(p.issue_date, p.created_at)) = d
            AND p.permit_type = 'Renewal' ${barangayFilter}) AS renewals,
        (SELECT COALESCE(SUM(pay.amount),0)::float FROM payments pay
          JOIN permits p ON p.id = pay.permit_id
          JOIN fisherfolk f ON f.id = p.fisherfolk_id
          WHERE date_trunc('month', pay.paid_at) = d AND pay.status = 'Fully Paid' ${barangayFilter}) AS revenue
       FROM generate_series(date_trunc('month', CURRENT_DATE) - INTERVAL '5 months', date_trunc('month', CURRENT_DATE), '1 month') d`,
      params
    );

    const byBarangay = await query(
      `SELECT f.barangay AS name, COUNT(*)::int AS value
       FROM permits p JOIN fisherfolk f ON f.id = p.fisherfolk_id
       GROUP BY f.barangay ORDER BY value DESC`
    );
    const boatTypes = await query(
      `SELECT boat_type AS name, COUNT(*)::int AS permits FROM permits GROUP BY boat_type ORDER BY permits DESC`
    );
    const totals = await query(
      `SELECT
        (SELECT COUNT(*)::int FROM permits) AS total_permits,
        (SELECT COUNT(*)::int FROM permits WHERE permit_type = 'Renewal') AS total_renewals,
        (SELECT COALESCE(SUM(amount),0)::float FROM payments WHERE status = 'Fully Paid') AS total_revenue,
        (SELECT COUNT(*)::int FROM permits
          WHERE status IN ('Active','Approved','Released')
            AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') AS expiring
      `
    );
    const colors = ["#3b82f6", "#14b8a6", "#8b5cf6", "#f59e0b", "#ef4444", "#64748b", "#0ea5e9"];
    res.json({
      monthly: monthly.rows,
      barangay: byBarangay.rows.map((r, i) => ({ ...r, color: colors[i % colors.length] })),
      boatTypes: boatTypes.rows,
      totals: totals.rows[0],
    });
  })
);

router.get(
  "/lookups",
  asyncH(async (_req, res) => {
    res.json({
      barangays: [
        "Barangay Canipo",
        "Barangay Taburi",
        "Barangay Campong-Ulay",
        "Barangay Iraan",
        "Barangay Culasian",
        "Barangay Lao",
        "Barangay Panalingaan",
      ],
      boatTypes: ["Motorized Banca", "Non-Motorized Banca", "Fishing Boat", "Motorboat"],
      fishingMethods: ["Hook and Line", "Net Fishing", "Trap Fishing", "Diving"],
      permitTypes: ["New Application", "Renewal", "Replacement"],
    });
  })
);

export default router;
