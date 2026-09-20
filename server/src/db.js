import fs from "fs";
import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "../.env");
const examplePath = path.join(__dirname, "../.env.example");
if (!fs.existsSync(envPath) && fs.existsSync(examplePath)) {
  fs.copyFileSync(examplePath, envPath);
}
dotenv.config({ path: envPath });

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 4000,
});

export async function query(text, params) {
  return pool.query(text, params);
}

export async function waitForDb() {
  let attempt = 0;
  while (true) {
    attempt += 1;
    try {
      await pool.query("SELECT 1");
      if (attempt > 1) console.log("PostgreSQL is ready.");
      return;
    } catch (err) {
      const detail = err?.message || "connection failed";
      console.log(`Waiting for PostgreSQL (${attempt}) — ${detail}`);
      if (attempt === 1) {
        console.log("Start it with: docker compose up -d");
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

export async function initSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('Head Admin', 'Staff', 'Cashier')),
      status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
      last_login TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS fisherfolk (
      id SERIAL PRIMARY KEY,
      public_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      barangay TEXT NOT NULL,
      contact TEXT NOT NULL,
      date_registered DATE NOT NULL DEFAULT CURRENT_DATE,
      archived BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS boats (
      id SERIAL PRIMARY KEY,
      fisherfolk_id INTEGER NOT NULL REFERENCES fisherfolk(id) ON DELETE CASCADE,
      boat_name TEXT,
      boat_type TEXT NOT NULL,
      fishing_method TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS permits (
      id SERIAL PRIMARY KEY,
      permit_number TEXT UNIQUE NOT NULL,
      fisherfolk_id INTEGER NOT NULL REFERENCES fisherfolk(id) ON DELETE CASCADE,
      boat_id INTEGER REFERENCES boats(id) ON DELETE SET NULL,
      permit_type TEXT NOT NULL,
      boat_type TEXT NOT NULL,
      fishing_method TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      issue_date DATE,
      expiry_date DATE,
      documents TEXT[] DEFAULT '{}',
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      public_id TEXT UNIQUE NOT NULL,
      permit_id INTEGER REFERENCES permits(id) ON DELETE SET NULL,
      permit_number TEXT NOT NULL,
      fisherfolk_name TEXT NOT NULL,
      barangay TEXT,
      permit_type TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      payment_method TEXT NOT NULL,
      or_number TEXT,
      reference_number TEXT,
      status TEXT NOT NULL DEFAULT 'Pending',
      cashier TEXT,
      paid_at DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL
    );
  `);
}

export async function nextCode(prefix, table, column) {
  const year = new Date().getFullYear();
  const like = `${prefix}-${year}-%`;
  const { rows } = await query(
    `SELECT ${column} AS code FROM ${table} WHERE ${column} LIKE $1 ORDER BY ${column} DESC LIMIT 1`,
    [like]
  );
  let n = 1;
  if (rows[0]?.code) {
    n = Number.parseInt(String(rows[0].code).split("-").pop(), 10) + 1;
  }
  return `${prefix}-${year}-${String(n).padStart(4, "0")}`;
}

export async function logActivity(user, action) {
  await query(
    "INSERT INTO activity_logs (user_id, user_name, action) VALUES ($1, $2, $3)",
    [user?.id || null, user?.name || "System", action]
  );
}

export async function addNotification(type, title, message) {
  await query(
    "INSERT INTO notifications (type, title, message) VALUES ($1, $2, $3)",
    [type, title, message]
  );
}

export async function expireOldPermits() {
  await query(`
    UPDATE permits
    SET status = 'Expired'
    WHERE status IN ('Active', 'Approved', 'Released')
      AND expiry_date IS NOT NULL
      AND expiry_date < CURRENT_DATE
  `);
}
