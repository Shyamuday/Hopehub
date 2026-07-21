# Remaining Apps — Task Tracker

Apps and portals not yet in the monorepo. Work through in order.

**Legend:** ✅ Done · 🔄 In progress · ⬜ Pending · ⏭ Skipped

---

## Already built (19 apps + API)

Patient, Admin, Doctor, Store Staff, Store Manager, HR, Receptionist, Clinic Manager, Accountant, Supplier, Warehouse, Delivery, Diagnostic, **Branch Owner**, **Patient Coordinator**, **Call Center**, **Marketing**, **Corporate Wellness**, **Insurance Partner** — see root `package.json` `dev:*` scripts.

---

## Phase D — New internal apps

| # | App | Port | Role | API prefix | Status |
|---|-----|------|------|------------|--------|
| D1 | `branch-owner-web` | 5200 | `BRANCH_OWNER` | `/branch-owner/*` | ✅ |
| D2 | `coordinator-web` | 5300 | `PATIENT_COORDINATOR` | `/coordinator/*` | ✅ |
| D3 | `callcenter-web` | 5400 | `CALL_CENTER` | `/call-center/*` | ✅ |
| D4 | `marketing-web` | 5500 | `MARKETING` | `/marketing/*` | ✅ |

## Phase E — External partner portals

| # | App | Port | Role | API prefix | Status |
|---|-----|------|------|------------|--------|
| E1 | `corporate-wellness-web` | 5600 | `CORPORATE_WELLNESS` | `/corporate-wellness/*` | ✅ |
| E2 | `insurance-web` | 5700 | `INSURANCE_PARTNER` | `/insurance/*` | ✅ |

---

## Per-app scope (MVP)

### D1 Branch Owner
- Branch P&L dashboard (revenue, payroll, expenses, net)
- Store summary KPIs
- Demo: `owner@hopehubclinic.local`

### D2 Patient Coordinator
- Adherence / follow-up queue for assigned branch
- High-risk patient list
- Demo: `coordinator@hopehubclinic.local`

### D3 Call Center
- Patient search
- Recent consultations list
- Demo: `callcenter@hopehubclinic.local`

### D4 Marketing
- Product analytics funnels (read-only)
- Demo: `marketing@hopehubclinic.local`

### E1 Corporate Wellness
- Corporate accounts list
- Enrolled employees per account
- Demo: `corporate@hopehubclinic.local`

### E2 Insurance Partner
- Insurance claims list + create claim
- Demo: `insurance@hopehubclinic.local`

---

## Admin management

| Item | Status |
|------|--------|
| RBAC capabilities for 6 portals + `admin.ecosystem_users` | ✅ |
| `/admin/ecosystem-users` API (CRUD, corporates) | ✅ |
| `admin-web` → **Ecosystem Users** page | ✅ |
| Notification broadcast role picker (all 19 roles) | ✅ |

---

| Item | Reason |
|------|--------|
| Standalone Research/Analytics app | Covered by `admin-web` Product Analytics |
| Native iOS/Android apps | Web/PWA only for now |
| Admin lab referrals UI | No commission model |
| Case Analysis AI | No AI for now |

---

## Implementation checklist (each app)

1. Prisma `Role` + profile model (+ domain tables if needed)
2. API router + seed demo user
3. Angular app (login, shell, dashboard, notification bell)
4. CORS origin + root `package.json` scripts
5. `demo-manifest.ts` entry + dev login panel

---

## Document history

| Date | Change |
|------|--------|
| 2026-07-03 | Initial tracker for Phase D/E |
| 2026-07-03 | Phase D/E complete — 6 apps scaffolded, APIs wired, seed + demo manifest |
| 2026-07-03 | Admin ecosystem user management + RBAC + notification roles |
