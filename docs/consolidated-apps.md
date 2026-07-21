# Consolidated frontend apps

The platform uses **3 primary web portals** (+ API).

## App map

| Portal | App folder | Port | Includes |
|--------|------------|------|----------|
| **Patient** | `apps/user-web` | 4203 | Patient mobile/web (Capacitor) |
| **Clinical** | `apps/doctor-web` | 4202 | Doctor mobile/web (Capacitor) |
| **Operations** | `apps/operations-web` | 5800 | Staff, partners, store, embedded admin (Capacitor) |
| **Admin UI source** | `apps/admin-web` | — | Compiled into operations-web at `/admin/*` |
| **API** | `apps/api` | 4000 | Backend |

Legacy per-role apps (`hr-web`, `partners-web`, `store`, etc.) have been **removed**. Root `dev:*` scripts alias to `dev:operations`.

## Auth model

- Login: `POST /auth/staff-login` with email + password (platform users and store staff)
- Session: `GET /me` for platform users; store staff receive capabilities in the login response
- Nav from `libs/platform-nav` filtered by capabilities

## Dev commands

```bash
npm run dev:operations   # http://localhost:5800 — everything except patient/doctor
npm run dev:admin        # alias → operations-web
npm run dev:doctor       # http://localhost:4202
npm run dev:user         # http://localhost:4203
```

## Mobile builds (Capacitor)

Native Android/iOS shells for field and on-the-go use. Admin console is included via the operations app (`/admin/*`).

```bash
npm run build:user:mobile        # Patient app
npm run build:doctor:mobile      # Doctor app
npm run build:operations:mobile  # Operations + admin + store staff
npm run build:mobile:all         # All three
```

`admin-web` has no separate mobile target — it ships inside `operations-web`.

## Web-only builds

```bash
npm run build:operations   # Staff portal (browser deploy)
npm run build:all          # user + doctor + operations web bundles
```

## Store staff

- Counter: `staff@ranchi.hopehub.local` → `/store/dashboard`
- Manager: `manager@ranchi.hopehub.local` → `/store-manager/dashboard`
- No PIN login — email + password only

## Migration status

- [x] Single operations portal (staff + partners + store)
- [x] Email/password auth for store staff
- [x] Full admin console embedded at `/admin/*`
- [x] Legacy app folders removed
- [x] CI builds consolidated apps only
