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

Standardize:

- Loading states
- Empty states
- Error states and retry actions

Why:

- Reduces support burden and user confusion in production.

Minimum acceptance:

- No blank/unclear screens for API failure or empty datasets.

## Phase 2 (After Launch Baseline)

- Doctor prescription templates (reusable medicine sets)
- Patient profile expansion (allergies, chronic history, current meds)
- Admin support tools (case notes, safer troubleshooting workflows)
- Adherence risk cohorts and trend alerts
- Better prescription PDF/share experience
- Product analytics instrumentation for core funnels

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
