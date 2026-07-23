# HopeHub

Clinic platform — Angular frontend + pure Node.js/Express/TypeScript backend.

## Apps

| App                                        | Path                  | Port |
| ------------------------------------------ | --------------------- | ---- |
| Patient                                    | `apps/user-web`       | 4203 |
| Doctor                                     | `apps/doctor-web`     | 4202 |
| Operations (staff, partners, store, admin) | `apps/operations-web` | 5800 |
| Admin (standalone)                         | `apps/admin-web`      | 4201 |
| Mind / Hope Hub                            | `apps/healing-web`    | 4204 |
| Admin UI source (embedded)                 | `apps/admin-web`      | —    |
| API                                        | `apps/api`            | 4000 |

Mobile (Capacitor): patient, doctor, and operations apps. Admin is embedded in operations — no separate mobile app.

For the full role/app roadmap and phasing (receptionist, clinic manager, supplier portal, etc.), see **[docs/platform-ecosystem-architecture.md](docs/platform-ecosystem-architecture.md)**.

For AI-assisted case analysis (image upload, camera capture, rubric suggestions), see **[docs/case-analysis-ai-enrichment.md](docs/case-analysis-ai-enrichment.md)**.

For homeopathic doctor types (Chief Consultant, Intern, Specialist, etc.), see **[docs/homeopathic-doctor-types.md](docs/homeopathic-doctor-types.md)**.

For AWS EC2 sizing and production deployment (100–500 patients/day), see **[docs/infrastructure-ec2.md](docs/infrastructure-ec2.md)**.

## Stack

- Patient web app: `apps/user-web` (Angular + Capacitor)
- Operations portal: `apps/operations-web` (staff, partners, store, embedded admin + Capacitor)
- Doctor web app: `apps/doctor-web` (Angular + Capacitor)
- Admin UI modules: `apps/admin-web` (compiled into operations-web)
- Backend API: `apps/api` (Express 5 + TypeScript + Prisma)
- Database: PostgreSQL (via `DATABASE_URL`)
- ORM: Prisma
- Realtime: Socket.io
- Payments: Razorpay
- Notifications: Email OTP, in-app notifications, email/push provider hooks

## Backend Setup

Copy `.env.example` to `.env` in `apps/api` and fill in the values:

```env
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
JWT_SECRET="change-before-production"
PORT=4000
WEB_ORIGIN="http://localhost:4203"
CORS_ORIGINS="http://localhost:4203,http://localhost:4204,http://localhost:4200"
DEV_OTP="123456"
RAZORPAY_KEY_ID=""
RAZORPAY_KEY_SECRET=""
RAZORPAY_WEBHOOK_SECRET=""
GOOGLE_CLIENT_ID=""
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="noreply@hopehubcare.in"
```

Run Prisma migrations and seed:

```powershell
npm run prisma:migrate --prefix apps/api
npm run seed --prefix apps/api
```

For a full local setup guide (fresh Postgres, `prisma db push`, demo logins, OOREP import, troubleshooting), see **[docs/data-seeding.md](docs/data-seeding.md)**.

## Local Development

Start local Postgres + Redis (optional):

```powershell
docker compose up -d
```

```powershell
npm install --prefix apps/user-web
npm install --prefix apps/api
npm run dev:user     # Patient web on :4203
npm run dev:doctor   # Doctor web on :4202
npm run dev:admin    # Admin web on :4201
npm run dev:operations  # Operations portal on :5800
npm run dev:api      # API on :4000
```

Quality checks from repo root (after `npm ci`):

```powershell
npm run lint      # ESLint + TypeScript check all apps
npm run test      # API + Angular unit tests
```

## Auth Flows

| Flow                          | Endpoint                                                                   |
| ----------------------------- | -------------------------------------------------------------------------- |
| Patient OTP login             | `POST /auth/request-otp` + `POST /auth/patient-login`                      |
| Patient password login        | `POST /auth/patient-login-password`                                        |
| Patient register              | `POST /auth/patient-register`                                              |
| Patient forgot/reset password | `POST /auth/patient-forgot-password` + `POST /auth/patient-reset-password` |
| Google login                  | `POST /auth/google` (requires `GOOGLE_CLIENT_ID`)                          |
| Staff (doctor/admin) login    | `POST /auth/staff-login`                                                   |
| Staff forgot/reset password   | `POST /auth/forgot-password` + `POST /auth/reset-password`                 |

## Realtime

Socket.io is used for live updates. The patient web connects on login with its JWT token and receives events:

- `consultation:updated` — when a consultation status changes
- `message:new` — when a new chat message is sent
- `prescription:new` — when a prescription is published
- `payment:updated` — when payment status changes

## Payment Setup

Razorpay payment setup steps are in `docs/razorpay-setup.md`.

## Demo Features

### Dev demo system (local only)

After migrating and seeding, every app login screen shows a **Dev quick login** panel (hidden in production builds).

```powershell
npm run prisma:migrate --prefix apps/api
npm run seed --prefix apps/api
```

| App        | Port | Quick-login persona                                      |
| ---------- | ---- | -------------------------------------------------------- |
| Patient    | 4203 | Rahul / Priya                                            |
| Operations | 5800 | All staff, partners, store counter, store manager, admin |
| Doctor     | 4202 | Dr. Meera Sharma                                         |

**Shared credentials:** `Password@123` (staff/admin/doctor/patients/store) · Store counter: `staff@ranchi.hopehub.local` · Store manager: `manager@ranchi.hopehub.local` · **OTP** `123456` · patient mobile `9876543210`

On each login screen in dev: demo **emails show automatically**, the first account **fills the form on load**, click **Fill** to switch demo users, then use normal **Sign in** (any other email works too), or **Instant** for one-click JWT login.

Full guide (JSON): `GET http://localhost:4000/dev/demo-guide` · one-click tokens: `POST /dev/quick-login` with `{ "persona": "admin", "app": "admin-web" }`

Disable in dev: set `DISABLE_DEV_DEMO=true` in API `.env`.

- Patient OTP and password register/login
- Staff email/password login
- Forgot/reset password flow (email-based for patients, token-based for staff)
- Google login (requires GIS script + `GOOGLE_CLIENT_ID`)
- Patient disease selection and intake form
- Consultation history and real-time chat
- Admin doctor management and assignment
- Doctor chat, prescription upload, and completion workflow
- Medicine dose scheduling and adherence tracking

## Production deployment

Target load: **100–500 patients per day** → **1× EC2 `t3.small`** + **1× RDS `db.t3.small`**.

```bash
cp deploy/.env.production.example deploy/.env   # fill in secrets and domains
bash deploy/scripts/deploy.sh                   # build frontends, migrate, start Docker
```

See **[docs/infrastructure-ec2.md](docs/infrastructure-ec2.md)** for architecture, security groups, TLS, and scale-out path.
