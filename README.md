# Vitalis Care and Research Centre Platform

Clinic platform — Angular frontend + pure Node.js/Express/TypeScript backend.

## Apps

| App | Path | Port |
|-----|------|------|
| Patient | `apps/user-web` | 4200 |
| Admin | `apps/admin-web` | 4201 |
| Doctor | `apps/doctor-web` | 4202 |
| Store staff | `apps/store` | 4300 |
| Store manager | `apps/store-manager-web` | 4301 |
| HR | `apps/hr-web` | 4400 |
| API | `apps/api` | 4000 |

For the full role/app roadmap and phasing (receptionist, clinic manager, supplier portal, etc.), see **[docs/platform-ecosystem-architecture.md](docs/platform-ecosystem-architecture.md)**.

## Stack

- Patient web app: `apps/user-web` (Angular)
- Admin web app: `apps/admin-web` (Angular)
- Doctor web app: `apps/doctor-web` (Angular)
- Backend API: `apps/api` (Express 5 + TypeScript + Prisma)
- Database: PostgreSQL (via `DATABASE_URL`)
- ORM: Prisma
- Realtime: Socket.io
- Payments: Razorpay
- Notifications: Twilio (SMS/WhatsApp)

## Backend Setup

Copy `.env.example` to `.env` in `apps/api` and fill in the values:

```env
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
JWT_SECRET="change-before-production"
PORT=4000
WEB_ORIGIN="http://localhost:4200"
DEV_OTP="123456"
RAZORPAY_KEY_ID=""
RAZORPAY_KEY_SECRET=""
RAZORPAY_WEBHOOK_SECRET=""
GOOGLE_CLIENT_ID=""
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="noreply@vitaliscare.in"
```

Run Prisma migrations and seed:

```powershell
npm run prisma:migrate --prefix apps/api
npm run seed --prefix apps/api
```

## Local Development

```powershell
npm install --prefix apps/user-web
npm install --prefix apps/api
npm run dev:user     # Patient web on :4200
npm run dev:api      # API on :4000
```

## Auth Flows

| Flow | Endpoint |
|------|---------|
| Patient OTP login | `POST /auth/request-otp` + `POST /auth/patient-login` |
| Patient password login | `POST /auth/patient-login-password` |
| Patient register | `POST /auth/patient-register` |
| Patient forgot/reset password | `POST /auth/patient-forgot-password` + `POST /auth/patient-reset-password` |
| Google login | `POST /auth/google` (requires `GOOGLE_CLIENT_ID`) |
| Staff (doctor/admin) login | `POST /auth/staff-login` |
| Staff forgot/reset password | `POST /auth/forgot-password` + `POST /auth/reset-password` |

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

| App | Port | Quick-login persona |
|-----|------|---------------------|
| Patient | 4200 | Rahul / Priya |
| Admin | 4201 | Clinic Admin |
| Doctor | 4202 | Dr. Meera Sharma |
| Store staff | 4300 | Counter Staff |
| Store manager | 4301 | Ranchi Store Manager |
| HR | 4400 | HR Manager |

**Shared credentials:** `Password@123` (staff/admin/doctor/patients/manager) · **PIN** `Password@123` for store staff `RNC-STF1` · **OTP** `123456` · patient mobile `9876543210`

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
