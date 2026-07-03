# Consolidated frontend apps

The platform uses **4 primary portals** (+ optional store POS).

## Target map

| Portal | App folder | Port | Absorbs |
|--------|------------|------|---------|
| **Patient** | `apps/user-web` | 4200 | Patient mobile/web (Capacitor) |
| **Clinical** | `apps/doctor-web` | 4202 | Doctor consultations |
| **Operations** | `apps/operations-web` | 5800 | Staff: HR, reception, clinic manager, accountant, branch owner, coordinator, call center, marketing, **full admin console** |
| **Partners** | `apps/partners-web` | 5900 | Supplier, warehouse, delivery, diagnostic, corporate wellness, insurance |
| **Store POS** (optional) | `apps/store` + `store-manager-web` | 4300–4301 | PIN login, tablet POS |

Legacy per-role apps under `apps/*-web` are **deprecated**. Root `dev:hr`, `dev:receptionist`, etc. alias to `dev:operations` or `dev:partners`.

## Auth model

- Staff login: `POST /auth/staff-login`
- Session: `GET /me` → `{ user, capabilities, portal, defaultRoute }`
- Nav from `libs/platform-nav` filtered by capabilities

## Dev commands

```bash
npm run dev:operations   # http://localhost:5800 — all staff + admin
npm run dev:partners     # http://localhost:5900 — external partners
npm run dev:admin        # alias → operations-web
```

## Admin console in operations

Platform admins use `/admin/*` inside operations-web. Admin pages are shared from `apps/admin-web` (same components, embedded with route prefix `admin`).

Standalone `admin-web` (port 4201) remains buildable for reference but **`dev:admin` points to operations**.

## Migration status

- [x] API capabilities on `/me`
- [x] `operations-web` + `partners-web` with capability guards
- [x] Full admin console embedded at `/admin/*`
- [x] Legacy `dev:*` scripts alias to consolidated apps
- [x] CI builds consolidated apps only
- [x] Capacitor scaffold on `user-web`
- [ ] Remove legacy app folders after production cutover
