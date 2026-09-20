import bcrypt from "bcryptjs";
import { waitForDb, initSchema, query, pool } from "./db.js";

const BARANGAYS = [
  "Barangay Canipo",
  "Barangay Taburi",
  "Barangay Campong-Ulay",
  "Barangay Iraan",
  "Barangay Culasian",
  "Barangay Lao",
  "Barangay Panalingaan",
];

async function seed() {
  await waitForDb();
  await initSchema();

  const { rows: existing } = await query("SELECT COUNT(*)::int AS n FROM users");
  if (existing[0].n > 0) {
    console.log("Database already has data. Skipping seed.");
    await pool.end();
    return;
  }

  const password = async (plain) => bcrypt.hash(plain, 10);

  const users = [
    ["Head Admin", "admin@rizal.gov.ph", await password("admin123"), "Head Admin", "Active"],
    ["Staff Officer", "staff@rizal.gov.ph", await password("staff123"), "Staff", "Active"],
    ["Cashier", "cashier@rizal.gov.ph", await password("cashier123"), "Cashier", "Active"],
    ["Staff User 2", "staff2@rizal.gov.ph", await password("staff123"), "Staff", "Active"],
    ["Staff User 3", "staff3@rizal.gov.ph", await password("staff123"), "Staff", "Inactive"],
  ];

  const userIds = [];
  for (const u of users) {
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, role, status, last_login)
       VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '1 day')
       RETURNING id`,
      u
    );
    userIds.push(rows[0].id);
  }

  const fisherfolk = [
    ["FF-2024-0001", "Juan Dela Cruz", "Barangay Canipo", "09123456789", "2024-01-15"],
    ["FF-2024-0002", "Maria Santos", "Barangay Taburi", "09123456790", "2024-02-20"],
    ["FF-2024-0003", "Pedro Reyes", "Barangay Campong-Ulay", "09123456791", "2024-03-10"],
    ["FF-2024-0004", "Ana Garcia", "Barangay Iraan", "09123456792", "2024-04-05"],
    ["FF-2024-0005", "Carlos Mendoza", "Barangay Culasian", "09123456793", "2024-05-01"],
    ["FF-2024-0006", "Rosa Villanueva", "Barangay Lao", "09123456794", "2024-06-12"],
    ["FF-2024-0007", "Ramon Bautista", "Barangay Panalingaan", "09123456795", "2024-07-08"],
    ["FF-2024-0008", "Liza Navarro", "Barangay Canipo", "09123456796", "2024-08-21"],
    ["FF-2025-0001", "Andres Flores", "Barangay Taburi", "09123456797", "2025-01-11"],
    ["FF-2025-0002", "Gloria Ramos", "Barangay Iraan", "09123456798", "2025-03-19"],
    ["FF-2026-0001", "Manuel Cruz", "Barangay Culasian", "09123456799", "2026-01-07"],
    ["FF-2026-0002", "Teresa Aguilar", "Barangay Panalingaan", "09123456800", "2026-02-14"],
  ];

  const ffIds = [];
  for (const f of fisherfolk) {
    const { rows } = await query(
      `INSERT INTO fisherfolk (public_id, name, barangay, contact, date_registered)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      f
    );
    ffIds.push(rows[0].id);
  }

  const boatSpecs = [
    [0, "Banca ni Juan", "Motorized Banca", "Hook and Line", 2],
    [1, "Maria Uno", "Non-Motorized Banca", "Net Fishing", 1],
    [2, "Reyes Voyager", "Fishing Boat", "Trap Fishing", 3],
    [3, "Iraan Star", "Motorized Banca", "Hook and Line", 1],
    [4, "Mendoza Wave", "Motorboat", "Net Fishing", 2],
    [5, "Villanueva Craft", "Non-Motorized Banca", "Diving", 1],
    [6, "Bautista Pride", "Fishing Boat", "Net Fishing", 2],
    [7, "Navarro Tide", "Motorized Banca", "Hook and Line", 1],
    [8, "Flores Banca", "Motorboat", "Trap Fishing", 1],
    [9, "Ramos Nets", "Non-Motorized Banca", "Net Fishing", 1],
    [10, "Cruz Runner", "Motorized Banca", "Hook and Line", 1],
    [11, "Aguilar Pearl", "Fishing Boat", "Diving", 2],
  ];

  const boatIds = [];
  for (const [ffIndex, name, type, method, count] of boatSpecs) {
    let firstId = null;
    for (let i = 0; i < count; i += 1) {
      const { rows } = await query(
        `INSERT INTO boats (fisherfolk_id, boat_name, boat_type, fishing_method)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [ffIds[ffIndex], i === 0 ? name : `${name} ${i + 1}`, type, method]
      );
      if (i === 0) firstId = rows[0].id;
    }
    boatIds.push(firstId);
  }

  const permits = [
    ["PERMIT-2024-0001", 0, "New Application", "Active", "2024-01-15", "2025-01-15"],
    ["PERMIT-2024-0002", 1, "New Application", "Expired", "2024-02-20", "2025-02-20"],
    ["PERMIT-2024-0003", 2, "New Application", "Active", "2024-03-10", "2027-03-10"],
    ["PERMIT-2025-0001", 3, "New Application", "Pending", "2025-04-05", "2026-04-05"],
    ["PERMIT-2025-0002", 4, "Renewal", "Active", "2025-05-01", "2026-05-01"],
    ["PERMIT-2025-0003", 5, "New Application", "Active", "2025-06-12", "2026-06-12"],
    ["PERMIT-2025-0004", 6, "Renewal", "Released", "2025-07-08", "2026-07-08"],
    ["PERMIT-2025-0005", 7, "New Application", "Verified", "2025-08-21", "2026-08-21"],
    ["PERMIT-2026-0001", 8, "New Application", "Active", "2026-01-11", "2027-01-11"],
    ["PERMIT-2026-0002", 9, "Renewal", "Expired", "2025-03-19", "2026-03-19"],
    ["PERMIT-2026-0003", 10, "New Application", "Pending", "2026-01-07", "2027-01-07"],
    ["PERMIT-2026-0004", 11, "Replacement", "Approved", "2026-02-14", "2027-02-14"],
    ["PERMIT-2026-0005", 0, "Renewal", "Active", "2026-01-20", "2027-01-20"],
    ["PERMIT-2026-0006", 2, "Renewal", "Active", "2026-03-10", "2027-03-10"],
  ];

  const permitIds = [];
  for (const [number, ffIndex, type, status, issue, expiry] of permits) {
    const ff = fisherfolk[ffIndex];
    const spec = boatSpecs[ffIndex];
    const { rows } = await query(
      `INSERT INTO permits (
         permit_number, fisherfolk_id, boat_id, permit_type, boat_type,
         fishing_method, status, issue_date, expiry_date, created_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [number, ffIds[ffIndex], boatIds[ffIndex], type, spec[2], spec[3], status, issue, expiry, userIds[0]]
    );
    permitIds.push({ id: rows[0].id, number, ffIndex, type, status, issue, name: ff[1], barangay: ff[2] });
  }

  const paymentRows = [
    [0, 500, "Cash", "OR-2026-001234", null, "Fully Paid", "2026-05-18", "Head Admin"],
    [1, 350, "Online", null, "REF-987654321", "Pending", "2026-05-18", null],
    [2, 500, "Cash", "OR-2026-001233", null, "Fully Paid", "2026-05-17", "Staff Officer"],
    [4, 350, "Cash", "OR-2026-001240", null, "Fully Paid", "2026-04-02", "Cashier"],
    [8, 500, "Online", null, "REF-112233445", "Fully Paid", "2026-01-12", "Cashier"],
    [12, 350, "Cash", "OR-2026-001250", null, "Fully Paid", "2026-01-21", "Staff Officer"],
    [13, 350, "Cash", "OR-2026-001260", null, "Fully Paid", "2026-03-11", "Cashier"],
    [11, 250, "Online", null, "REF-556677889", "Partially Paid", "2026-02-15", "Cashier"],
  ];

  let payN = 1;
  for (const [pIndex, amount, method, orNumber, ref, status, date, cashier] of paymentRows) {
    const p = permitIds[pIndex];
    await query(
      `INSERT INTO payments (
         public_id, permit_id, permit_number, fisherfolk_name, barangay, permit_type,
         amount, payment_method, or_number, reference_number, status, cashier, paid_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        `PAY-2026-${String(payN).padStart(4, "0")}`,
        p.id,
        p.number,
        p.name,
        p.barangay,
        p.type === "New Application" ? "New Permit" : p.type,
        amount,
        method,
        orNumber,
        ref,
        status,
        cashier,
        date,
      ]
    );
    payN += 1;
  }

  const notifications = [
    ["expiration", "Permit Expiring Soon", "Several permits will expire in the next 30 days"],
    ["approval", "Application Approved", "Juan Dela Cruz's permit renewal has been approved"],
    ["payment", "Payment Received", "New payment recorded for PERMIT-2026-0001"],
    ["renewal", "Renewal Reminder", "Fisherfolk with expired permits need to renew this month"],
    ["announcement", "System Announcement", "MFARPS is now available as an installable Progressive Web App"],
  ];
  for (const [type, title, message] of notifications) {
    await query(
      "INSERT INTO notifications (type, title, message, is_read) VALUES ($1, $2, $3, $4)",
      [type, title, message, type === "announcement" || type === "renewal"]
    );
  }

  const logs = [
    [userIds[0], "Head Admin", "Created new permit for Juan Dela Cruz"],
    [userIds[1], "Staff Officer", "Processed payment for PERMIT-2026-0005"],
    [userIds[0], "Head Admin", "Approved permit application PERMIT-2026-0004"],
    [userIds[1], "Staff Officer", "Updated fisherfolk record FF-2024-0003"],
    [userIds[0], "Head Admin", "Generated monthly report"],
    [userIds[2], "Cashier", "Recorded cash payment OR-2026-001250"],
  ];
  for (const [userId, name, action] of logs) {
    await query(
      "INSERT INTO activity_logs (user_id, user_name, action) VALUES ($1, $2, $3)",
      [userId, name, action]
    );
  }

  await query(
    `INSERT INTO settings (key, value) VALUES
      ('fees', '{"newPermit":500,"renewal":350,"replacement":250,"lateRenewalPenalty":100}'),
      ('notifications', '{"expirationReminders":true,"paymentAlerts":true,"applicationUpdates":true}'),
      ('security', '{"strongPasswords":true,"twoFactor":false}'),
      ('system', '{"municipality":"Dr. Jose P. Rizal, Palawan","systemName":"Municipal Fisherfolk & Boat Permit System","version":"1.0.0"}')
    ON CONFLICT (key) DO NOTHING`
  );

  console.log("Seed complete.");
  console.log("Barangays available:", BARANGAYS.join(", "));
  console.log("Demo accounts:");
  console.log("  Head Admin  admin@rizal.gov.ph     / admin123");
  console.log("  Staff       staff@rizal.gov.ph     / staff123");
  console.log("  Cashier     cashier@rizal.gov.ph   / cashier123");
  await pool.end();
}

seed().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
