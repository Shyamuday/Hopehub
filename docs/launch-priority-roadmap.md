# Launch Priority Roadmap

This document defines what should be completed next across consumer, admin, and doctor apps before launch, followed by phase-2 improvements.

## Must-Have Before Launch

### 1) Doctor Worklist + Follow-up Visibility

**Status: Done** — dedicated Worklist page (`/worklist`), `GET /doctor/worklist` API, dashboard summary, follow-up urgency badges.

Build a doctor-facing worklist with at least these sections:

- Assigned
- In-progress
- Follow-up due

Why:

- Doctors need an operational queue to avoid missed patients and delayed follow-ups.

Minimum acceptance:

- Doctor can see and filter their active patient workload.
- Follow-up due items are clearly highlighted.

---

### 2) Consumer Reminder Reliability Controls

**Status: Done** — reminder channel preferences, snooze with quick presets, inline skip/missed reasons saved to API and visible to doctor/admin.

Add patient controls for medicine reminders:

- Notification preferences (SMS/WhatsApp/push/in-app where available)
- Snooze reminder action
- Missed-dose reason capture

Why:

- Adherence tracking is only useful if reminder interactions are practical and captured consistently.

Minimum acceptance:

- Patient can control reminder channels.
- Snooze and missed-reason are saved and visible to doctor/admin.

---

### 3) Admin Audit Trail

**Status: Done** — audit logs on doctor approve/reject/status/profile edits and consultation assignment; dedicated Audit Trail page with filters.

Track and expose key administrative actions:

- Doctor approval/rejection
- Doctor status toggle (activate/deactivate)
- Doctor profile edits

Why:

- Auditability is required for accountability, support, and compliance readiness.

Minimum acceptance:

- Every action stores actor, action, target, and timestamp.
- Admin can view recent audit entries in a basic list.

---

### 4) Prescription Safety Guardrails (Doctor)

**Status: Done** — homeopathy-aware checks: multiple potencies allowed; warns on repeated same potency or conflicting dose/frequency; explicit confirm to save/publish.

Add basic safety checks in prescription editor:

- Duplicate medicine warning (same medicine in same prescription)
- Optional warning for same medicine with conflicting dose/frequency

Why:

- Prevent avoidable prescribing mistakes in day-to-day use.

Minimum acceptance:

- Warning shown before save/publish when duplicates exist.
- Doctor can still proceed with explicit confirmation if required.

---

### 5) Admin Finance/Ops Basics

**Status: Done** — payments page and dashboard with status/date filters, summary cards (gross/collected/pending/failed), paginated list, and CSV export of all matching records (up to 10k).

Enhance admin payments/reports view with:

- Payment status filters (paid/pending/failed)
- Date range filter
- CSV export

Why:

- Required for operational reconciliation and manual review.

Minimum acceptance:

- Admin can filter and export payment records from UI.

---

### 6) UX Reliability Pass Across All Apps

**Status: Done** — shared `_ux-states.scss` in admin/doctor/user-web; standardized loading, empty, error + retry patterns on key pages (payments, finance, audit, consumers, worklist, patient profile, dashboard); store apps use matching layout utilities.

Standardize:

- Loading states
- Empty states
- Error states and retry actions

Why:

- Reduces support burden and user confusion in production.

Minimum acceptance:

- No blank/unclear screens for API failure or empty datasets.

## Phase 2 (After Launch Baseline)

### 1) Doctor Prescription Templates

**Status: Done** — per-doctor templates API (`/doctor/prescription-templates`); apply/save/delete from the appointments prescription editor.

### 2) Patient Profile Expansion (Clinical Context)

**Status: Done** — patients edit allergies, current meds, and chronic conditions in user-web; doctors see clinical profile when prescribing, scanning, or viewing adherence; admins see it on consumer detail.

### 3) Admin Support Tools

**Status: Done** — per-patient support context (flags, read-only consultation timeline, reminder prefs, recent audit) and append-only case notes with categories; audit log on each note.

- Case notes, safer troubleshooting workflows

### 4) Adherence Risk Cohorts

**Status: Done** — `GET /admin/adherence/risk-cohorts` groups patients into high/medium/on-track cohorts with platform trend, trend alerts (drops, high missed, unexplained skips), dedicated Adherence Risk page, and dashboard summary.

- Trend alerts for at-risk patient groups

### 5) Prescription PDF / Share

**Status: Done** — improved PDF layout (patient ID, version, clinic branding); `disposition=inline` for view/print; share metadata API; patient UI with view/download/print/share/WhatsApp; doctor PDF actions on published prescriptions.

- Better download and share experience

### 6) Product Analytics

**Status: Done** — `ProductEvent` model with server-side funnel instrumentation (login, booking, payment, assignment, prescription publish, dose taken, worklist views); `POST /analytics/events` for client events; `GET /admin/analytics/funnels` with conversion table and daily trend; admin Product Analytics page; demo seed funnel for Rahul.

- Instrumentation for core funnels

## Post-Launch Operations

### Dev Demo System (all apps)

**Status: Done** — fixed demo manifest, `GET /dev/demo-guide`, quick-login and fill on all six apps, dev OTP echo, seed aligned to personas; disabled in production via `NODE_ENV` / `DISABLE_DEV_DEMO`.

- One-click and fill-to-login for testing every app with shared dummy data

---

## Phase 3 (Platform Scale)

### 1) CI & Build Hardening

**Status: Done** — `store-manager-web` added to CI matrix; API job runs `prisma generate` before lint/build.

- Every app in the monorepo validates on push/PR
- Prisma client generated before API typecheck

### 2) Admin HR Ops Reliability

**Status: Done** — HR middleware accepts platform admin JWT (`id` or `userId`); Employees, Leaves, and Stores pages use shared loading/empty/error + retry patterns.

- Admin can use HR-backed pages without a separate HR login
- Failed API loads show a clear message and retry

### 3) Branch Finance Exports (Accountant basics)

**Status: Done** — `GET /admin/finance/branches` per-store P&L (consultation, medicine, payroll, store/clinic expenses, net); `GET /admin/finance/export-bundle` multi-section GST-ready CSV (branch P&L, payments, medicine sales, payroll, expenses); admin Finance “Branch P&L” tab and accountant bundle export with optional branch filter.

- Per-branch revenue vs payroll vs expenses
- Downloadable CSV bundles for accountant reconciliation

### 4) Front Desk / Receptionist (Platform Phase 2)

**Status: Done** — `RECEPTIONIST` role + `ReceptionistProfile`; reception API (`/reception/queue`, walk-in registration, cash collection, doctor assignment); `receptionist-web` app on port 4500 with queue board and walk-in form; demo persona `reception@vitalisclinic.local`.

- Dedicated receptionist role and app
- Walk-in patient registration and queue management

### 5) Clinic Manager Hub (Platform Phase 2)

**Status: Done** — `CLINIC_MANAGER` role + `ClinicManagerProfile`; clinic-manager API (`/clinic-manager/dashboard`, `/roster`, `/schedules`); `clinic-manager-web` on port 4600 with branch KPIs, staff attendance roster, and doctor slot visibility; demo persona `clinic@vitalisclinic.local`.

- Day-to-day branch operations console
- Staff attendance and schedule visibility

## Phase 4 (Money & Supply Chain)

### 1) Accountant Web App (Platform Phase 3)

**Status: Done** — `ACCOUNTANT` role + `AccountantProfile`; accountant API (`/accountant/summary`, `/branches`, `/export-bundle`); `accountant-web` on port 4700 with month summary, branch P&L table, and CSV export; demo persona `accountant@vitalisclinic.local`.

- Dedicated finance/compliance console for accountants
- GST-ready export bundles without full admin access

### 2) Supplier Portal (Platform Phase 3)

**Status: Done** — `SUPPLIER` role + `SupplierProfile`; `Supplier`, `PurchaseOrder`, `GoodsReceiptNote` models; supplier API (`/supplier/purchase-orders`, confirm dispatch); store manager GRN (`POST /store/purchase-orders/:id/grn`) updates stock via `PURCHASE_IN`; `supplier-web` on port 4800; demo PO seeded for Ranchi; demo persona `supplier@vitalisclinic.local`.

- Supplier-facing PO and delivery confirmation
- GRN updates store stock on receipt

### 3) Warehouse / Central Inventory (Platform Phase 3)

**Status: Done** — `WAREHOUSE_MANAGER` role + `WarehouseManagerProfile`; `StoreKind` (`BRANCH`/`WAREHOUSE`); `StockTransfer` models; warehouse API (`/warehouse/dashboard`, `/transfers`, dispatch); store manager receive (`POST /store/stock-transfers/:id/receive`) updates stock via `TRANSFER_IN`; `warehouse-web` on port 4900; demo warehouse in Kolkata with pending transfer to Ranchi; demo persona `warehouse@vitalisclinic.local`.

- Central warehouse stock hub and branch transfer workflow
- Dispatch deducts warehouse batches; branch receive posts `TRANSFER_IN`

## Phase 5 (Growth & Ecosystem)

### 1) Delivery Executive App (Platform Phase 4)

**Status: Done** — `DELIVERY_EXECUTIVE` role + `DeliveryExecutiveProfile`; `MedicineDelivery` models with OTP proof; delivery API (`/delivery/orders`, accept/pickup/complete/fail); store manager create (`POST /store/deliveries`); `delivery-web` on port 5000; demo pending delivery for Rahul (OTP `123456`); demo persona `delivery@vitalisclinic.local`.

- Last-mile home medicine delivery for patients
- OTP proof on handover; store manager schedules deliveries

### 2) Diagnostic Center Portal (Platform Phase 4)

**Status: Done** — `DIAGNOSTIC_PARTNER` role + `DiagnosticCenterProfile`; `LabReferral` models; diagnostic API (`/diagnostic/referrals`, accept/advance/results); admin create (`POST /admin/lab-referrals`); `diagnostic-web` on port 5100; demo referral for Rahul; demo persona `lab@vitalisclinic.local`.

- External lab partner portal for test referrals and result publishing
- Clinic admin sends referrals; lab accepts and posts structured results

### 3) Doctor & Patient Lab Results View

**Status: Done** — Patient API (`GET /patient/lab-results`); doctor API (`GET /doctor/patients/:id/lab-referrals`); lab results panel on patient dashboard (`user-web`); lab referrals section on doctor Patients page; demo referral auto-published as `RESULT_READY` for Rahul on seed.

- Patients see published `RESULT_READY` results with per-test summaries
- Doctors see full referral timeline (pending + published) for assigned patients

## Recommended Implementation Order

1. Doctor worklist + follow-up due
2. Consumer reminder preferences/snooze/reason
3. Admin audit trail
4. Prescription duplicate checks
5. Finance filters/export
6. UX reliability pass

## Delivery Notes

- Keep role model strict: `PATIENT`, `DOCTOR`, `ADMIN` only.
- Prefer API-first implementation for all new flows.
- Add/extend CI checks for each completed feature set.
