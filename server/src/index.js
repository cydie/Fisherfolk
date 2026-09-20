import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { waitForDb, initSchema, query } from "./db.js";
import api from "./routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "../.env");
if (!fs.existsSync(envPath)) {
  fs.copyFileSync(path.join(__dirname, "../.env.example"), envPath);
}
dotenv.config({ path: envPath });

const app = express();
const port = Number(process.env.PORT || 4001);

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "mfarps-api" });
});

app.use("/api", api);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Server error" });
});

function listen() {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`MFARPS API listening on http://localhost:${port}`);
      resolve(server);
    });
    server.on("error", (err) => {
      reject(err);
    });
  });
}

async function isOurApiRunning() {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    const data = await res.json();
    return res.ok && data.service === "mfarps-api";
  } catch {
    return false;
  }
}

async function start() {
  await waitForDb();
  await initSchema();
  const { rows } = await query("SELECT COUNT(*)::int AS n FROM users");
  if (rows[0].n === 0) {
    console.log("No users found. Run: npm run seed --prefix server");
  }

  try {
    await listen();
  } catch (err) {
    if (err.code === "EADDRINUSE") {
      if (await isOurApiRunning()) {
        console.log(`Port ${port} is already serving MFARPS. Use http://localhost:${port}`);
        console.log("You can ignore this extra watcher, or stop the other terminal and restart.");
        await new Promise(() => {});
        return;
      }
      console.error(`Port ${port} is already in use by another app. Change PORT in server/.env`);
    }
    throw err;
  }
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
