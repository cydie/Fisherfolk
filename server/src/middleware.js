import jwt from "jsonwebtoken";
import { query } from "./db.js";

export function asyncH(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Sign in required" });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await query(
      "SELECT id, name, email, role, status FROM users WHERE id = $1",
      [payload.id]
    );
    const user = rows[0];
    if (!user || user.status !== "Active") {
      return res.status(401).json({ error: "Account is inactive" });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Session expired" });
  }
}

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You do not have permission for this action" });
    }
    next();
  };
}

export function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    last_login: user.last_login || null,
  };
}
