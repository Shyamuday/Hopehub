# Vitalis 2-Week Implementation Plan

This plan converts the current state into a production-ready API-first baseline, focused on auth safety, prescription workflows, adherence tracking, and admin operations.

## Goals for This Sprint

- Complete API-first migration for frontend flows.
- Stabilize auth/role enforcement across backend and all apps.
- Finish doctor and admin critical workflows.
- Add automated quality gates (lint/type/test/build) in CI.

## Week 1 (Core Reliability + API-first Completion)

### Day 1: Auth and Role Hardening

Backend (`apps/api`):

- Validate all protected routes use auth middleware and `allowRoles(PATIENT|DOCTOR|ADMIN)` only.
- Ensure `/auth/staff-login` and `/me` return consistent role/session payloads.
- Add explicit forbidden responses for role mismatch.
- Add audit logging for login success/failure.

Files to touch:

- `apps/api/src/index.ts`
- `apps/api/src/*` (if middleware is split later)

Acceptance:

- Role mismatch always returns 403.
- Inactive doctor login path remains blocked with clear message.

### Day 2: Remove Remaining Direct Supabase Calls in Web App

Frontend (`apps/user-web`):

- Replace any direct Supabase reads for prescriptions and dose events with backend endpoints.
- Keep frontend only for UI state and API calls.
- Confirm auth token is consistently attached through interceptor.

Files to touch:

- `apps/user-web/src/app/clinic-api.service.ts`
- `apps/user-web/src/app/dashboard.component.ts`
- `apps/user-web/src/app/auth/auth.service.ts`

Acceptance:

- No direct patient prescription/dose reads from Supabase client.
- Dashboard works with backend APIs only.

### Day 3: Doctor Prescription Workflow Completion

Doctor app (`apps/doctor-web`):

- Finalize draft/publish/edit/follow-up actions with clear button states.
- Auto-pin latest published + current draft cards at top of timeline.
- Improve form validation for medicine rows (dose/frequency/duration required).

Files to touch:

- `apps/doctor-web/src/app/features/appointments/appointments-page/*`
- `apps/doctor-web/src/app/core/services/auth.ts` (if auth/session guards need refinement)

Acceptance:

- Doctor can edit latest draft, publish, and create follow-up version reliably.
- Timeline clearly identifies state and current editable record.

### Day 4: Admin Doctor/Consumer Management Basics

Admin app (`apps/admin-web`) + backend (`apps/api`):

- Add backend pagination/filtering for doctors and consumer lists.
- Add admin actions to activate/deactivate doctor.
- Add consumer detail page shell (consultations + prescriptions + adherence summary).

Files to touch:

- `apps/api/src/index.ts`
- `apps/admin-web/src/app/core/services/admin-api.ts`
- `apps/admin-web/src/app/features/doctors/doctors-page/*`
- `apps/admin-web/src/app/features/consumers/consumers-page/*`

Acceptance:

- Large lists remain performant with pagination.
- Admin can review and control doctor account status.

### Day 5: Testing and Fix Pass (Week 1)

- API integration tests for:
  - auth role enforcement
  - prescription versioning
  - dose event actions (`take`/`skip`)
- Frontend smoke tests for:
  - patient dashboard medicines section
  - doctor prescription editor critical path
  - admin pending doctor approval flow

Suggested paths:

- `apps/api/tests/*`
- `apps/user-web/src/app/**/*.spec.ts`
- `apps/doctor-web/src/app/**/*.spec.ts`
- `apps/admin-web/src/app/**/*.spec.ts`

Acceptance:

- Critical path tests pass locally.
- Typecheck and build pass for all apps.

## Week 2 (Operational Maturity + Notifications + CI)

### Day 6: Adherence Scheduler

Backend (`apps/api`):

- Implement scheduled job to mark overdue `PENDING` doses as `MISSED`.
- Make schedule interval configurable via env.

Files to touch:

- `apps/api/src/index.ts` (or extract scheduler service)
- `apps/api/.env.example` (add scheduler config variables)

Acceptance:

- Overdue doses transition to `MISSED` correctly.

### Day 7: Notifications Framework (MVP)

- Add notification abstraction for reminders (start with console/mock provider).
- Trigger reminders for upcoming dose windows and follow-up dates.

Files to touch:

- `apps/api/src/index.ts` (or `services/notifications.ts`)
- Optional new provider file(s)

Acceptance:

- Reminder events are generated and logged with user/prescription context.

### Day 8: Admin Consumer Detail and Doctor Adherence Views

Admin + doctor UX:

- Consumer detail page with tabs:
  - profile
  - consultations
  - prescriptions
  - adherence snapshot
- Improve doctor patient adherence summary view for quick action.

Files to touch:

- `apps/admin-web/src/app/features/consumers/*`
- `apps/doctor-web/src/app/features/patients/*`
- `apps/api/src/index.ts` (if extra endpoints needed)

Acceptance:

- Admin and doctor can inspect adherence trend for each patient quickly.

### Day 9: CI and Release Pipeline

- Add CI workflow with:
  - install
  - lint
  - typecheck
  - tests
  - build for all apps
- Add migration safety step for API deploy.

Files to touch:

- `.github/workflows/ci.yml`
- Optional deploy workflow docs

Acceptance:

- PRs fail fast on lint/type/test/build regressions.

### Day 10: Security + Documentation Finish

- Add security checklist and runbook:
  - secret handling
  - rotation policy
  - log redaction rules
  - incident response basics
- Finalize setup docs for local/stage/prod envs.

Files to touch:

- `docs/backend-auth-supabase-env.md`
- `docs/supabase-setup.md`
- `README.md`

Acceptance:

- New contributor can set up and run all apps from docs only.

## Prioritized Backlog (After 2 Weeks)

- Drug interaction warnings and dosage safety constraints.
- PDF prescription generation and share/export.
- Push/SMS/WhatsApp reminder provider integration.
- Full audit logs for admin/doctor critical actions.
- Ionic migration preparation (shared service layer extraction).

## Definition of Done (Sprint)

- API-first data access is complete for critical patient/doctor/admin flows.
- Prisma schema, client, and migrations are aligned with deployed DB.
- No `SUPER_ADMIN` references remain in role logic.
- Critical user journeys pass tests and CI checks.
- Env and deployment docs are updated and accurate.
