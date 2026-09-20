# MFARPS — Municipal Fisherfolk & Boat Permit System

Progressive Web App for the Municipality of Dr. Jose P. Rizal, Palawan. Staff can register fisherfolk, issue and renew boat permits, record payments, and view reports.

## Stack

- **Frontend:** React 18, Vite, Bootstrap 5, Recharts (installable PWA)
- **Backend:** Node.js, Express, JWT auth
- **Database:** PostgreSQL 16 (Docker)

## How to run

You need **Node.js 18+** and **Docker Desktop**.

From the project folder:

```bash
npm install
npm run setup
npm run dev
```

`npm run setup` starts PostgreSQL, installs client/server packages, and loads demo data.

Then open **http://localhost:5173**

- API: http://localhost:4001/api/health
- Database: `127.0.0.1:5437` (user `fisherfolk` / password `fisherfolk` / database `mfarps`)

To install it as an app, open the site in Chrome or Edge and use **Install app** (or the in-page prompt).

## Demo accounts

| Role | Email | Password | Access |
| --- | --- | --- | --- |
| Head Admin | `admin@rizal.gov.ph` | `admin123` | Full system, users, settings, fees |
| Staff | `staff@rizal.gov.ph` | `staff123` | Permits, records, reports, payments |
| Cashier | `cashier@rizal.gov.ph` | `cashier123` | Dashboard, records, payments, notifications |

Inactive sample account (cannot sign in): `staff3@rizal.gov.ph` / `staff123`

## Useful commands

```bash
npm run docker:up     # start PostgreSQL only
npm run seed          # reload demo data (skipped if users already exist)
npm run docker:down   # stop PostgreSQL
```

To reseed from scratch:

```bash
docker compose down -v
npm run setup
npm run dev
```
