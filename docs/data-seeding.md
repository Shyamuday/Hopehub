# Data seeding guide

This document explains how to set up PostgreSQL and load demo data for local development.

All seeding runs from **`apps/api`**. Demo accounts and IDs are defined in `apps/api/src/dev/demo-manifest.ts`. The main script is `apps/api/prisma/seed.ts`.

---

## Prerequisites

1. **PostgreSQL** running locally (or a reachable remote instance).
2. **`apps/api/.env`** — copy from `.env.example` and set at minimum:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/hopehub_clinic?schema=public"
JWT_SECRET="change-this-before-production"
DEV_OTP="123456"
```

3. **Node dependencies** installed:

```powershell
npm install --prefix apps/api
```

---

## Fresh database setup

### Option A — Local dev (recommended)

Use `db push` to sync the full Prisma schema. This works well on a new empty database.

```powershell
cd apps/api

# Create DB once in psql if needed:
# CREATE DATABASE hopehub_clinic;

npm run prisma:push
npm run seed
npm run dev
```

### Option B — Migrations (`prisma migrate deploy`)

The migration history is incremental. On a **brand-new** database, `migrate deploy` may fail if an early migration references tables that are only created by later schema evolution. If deploy fails, use **Option A** for local dev.

After schema is in place:

```powershell
npm run prisma:deploy
npm run seed
```

### Regenerate Prisma client (after schema changes)

```powershell
npm run prisma:generate --prefix apps/api
```

---

## Main seed command

```powershell
npm run seed --prefix apps/api
```

Or from `apps/api`:

```powershell
npm run seed
```

The script:

- Loads `.env` via `dotenv/config` (required for `DATABASE_URL`).
- Uses **upserts** for most records — safe to re-run; it refreshes demo users and updates linked data.
- Prints a summary with logins when finished.

---

## What gets seeded

| Area | Contents |
|------|----------|
| **Platform users** | Admin, doctor, HR, receptionist, clinic manager, accountant, supplier, warehouse, delivery, diagnostic, branch owner, coordinator, call center, marketing, corporate wellness, insurance |
| **Patients** | Rahul (`RNC-000001`) and Priya (`RNC-000002`) on shared mobile `9876543210` |
| **Stores** | Ranchi branch (`RNC`) + Kolkata warehouse (`WH`) |
| **Store staff** | Manager + counter staff for Ranchi |
| **Clinical** | Diseases, consultations (in-progress + assigned), prescriptions, dose events, payments |
| **Inventory** | Demo medicines (Arnica 30, Sulphur 200), stock batches, purchase order, stock transfer |
| **Operations** | Medicine delivery, lab referral with published results |
| **Admin / analytics** | Audit logs, support notes, product events |
| **Repertory** | Mini Kent-style sample rubrics (see below) |

---

## Demo credentials

| Field | Value |
|-------|--------|
| **Staff / admin password** | `Password@123` |
| **Patient OTP (dev)** | `123456` (or `DEV_OTP` in `.env`) |
| **Patient mobile** | `9876543210` |

### Quick reference logins

| Role | Email | App |
|------|-------|-----|
| Admin | `admin@hopehubclinic.local` | Admin (embedded in operations `:5800`) |
| Doctor | `doctor@hopehubclinic.local` | Doctor `:4202` |
| HR | `hr@hopehubclinic.local` | Operations `:5800` |
| Patient (Rahul) | `patient1@hopehubclinic.local` or mobile OTP | Patient `:4203` |
| Store manager | `manager@ranchi.hopehub.local` | Operations `:5800` |
| Store staff | `staff@ranchi.hopehub.local` | Operations `:5800` |

Full persona list: `GET http://localhost:4000/dev/demo-guide` (API must be running, dev mode only).

Patient scan URL after seed: `http://localhost:4000/go/p/RNC-000001`

---

## Repertory data

### Mini sample (included in `npm run seed`)

`prisma/seeds/repertory-seed.ts` loads a small **Repertorium Publicum (MVP sample)** set (~dozen remedies, sample rubrics). Enough for:

- Doctor app → **Repertory** menu (standalone practice)
- Worklist → **Case analysis** on a consultation

If a full OOREP import already exists (>1000 rubrics), the mini sample is skipped automatically.

### Full OOREP import (optional, GPL)

For production-like repertory search (Kent + publicum):

```powershell
# 1. Download dump (~large)
npm run repertory:download:oorep --prefix apps/api

# 2. Schema must exist first
npm run prisma:push --prefix apps/api

# 3. Import (can take several minutes)
npm run repertory:import:oorep --prefix apps/api
```

Optional flags:

```powershell
npm run repertory:import:oorep --prefix apps/api -- --sql data/oorep/oorep.sql --sources publicum,kent-de
```

Details and license notes: `apps/api/data/oorep/README.md`.

After OOREP import you do **not** need to re-run the main seed for repertory — run `npm run seed` only if you also need demo users/consultations refreshed.

---

## Typical workflows

### First-time local setup

```powershell
npm install --prefix apps/api
copy apps\api\.env.example apps\api\.env
# Edit DATABASE_URL and JWT_SECRET

cd apps\api
npm run prisma:push
npm run seed
npm run dev
```

### Reset database completely

```powershell
# In psql:
# DROP DATABASE hopehub_clinic;
# CREATE DATABASE hopehub_clinic;

cd apps\api
npm run prisma:push
npm run seed
```

### Refresh demo data only (keep schema)

```powershell
npm run seed --prefix apps/api
```

### Add full repertory to existing demo DB

```powershell
npm run repertory:download:oorep --prefix apps/api
npm run repertory:import:oorep --prefix apps/api
```

---

## Troubleshooting

| Error | Cause | Fix |
|-------|--------|-----|
| `ECONNREFUSED` | PostgreSQL not running or wrong host/port | Start Postgres; verify `DATABASE_URL` |
| `database "hopehub_clinic" does not exist` | DB not created | `CREATE DATABASE hopehub_clinic;` in psql |
| `client password must be a string` | `DATABASE_URL` missing when seed runs | Ensure `import 'dotenv/config'` is at top of `seed.ts` and `.env` exists |
| `SASL: SCRAM...` with empty password | Same as above | Check `.env` path and `DATABASE_URL` format |
| Repertory search returns nothing | Mini seed skipped and OOREP not imported | Run OOREP import or check `repertoryRubric` row count |
| `No active repertory source configured` | No `repertorySource` rows | Run `npm run seed` |
| Migration `P3018` on fresh DB | Incremental migrations out of order | Use `npm run prisma:push` for local dev |

### Verify Postgres connection

```powershell
$env:PGPASSWORD='YOUR_PASSWORD'
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -d hopehub_clinic -c "SELECT 1;"
```

### Verify seed worked

```powershell
npm run seed --prefix apps/api
# Expect: "── Dev demo seed complete ──"
```

Then log in as `admin@hopehubclinic.local` / `Password@123` or use the dev quick-login panel on any app login screen.

---

## Related files

| Path | Purpose |
|------|---------|
| `apps/api/prisma/seed.ts` | Main seed orchestrator |
| `apps/api/prisma/seeds/repertory-seed.ts` | Mini repertory sample |
| `apps/api/src/dev/demo-manifest.ts` | Demo emails, passwords, personas |
| `apps/api/scripts/download-oorep-sql.ts` | Download OOREP dump |
| `apps/api/scripts/import-oorep-sql.ts` | Import OOREP into Postgres |
| `apps/api/src/routes/dev.ts` | `/dev/demo-guide` and quick-login API |

---

## Production note

- Demo seed is for **development only**.
- Set `DISABLE_DEV_DEMO=true` in production to hide quick-login and dev routes.
- Never use `Password@123` or default `JWT_SECRET` in production.
