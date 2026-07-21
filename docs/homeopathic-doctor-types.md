# Homeopathic Doctor Types

HopeHub classifies every doctor account with a **homeopathic doctor type** and optional **specialty focus**. This drives labels in the doctor app, admin onboarding, and HR joining letters.

---

## Doctor types

| Code | Label | Typical use |
|------|-------|-------------|
| `CHIEF_CONSULTANT` | Homeopathic Doctor (Chief Consultant) | Senior lead consultant, full clinic access |
| `JUNIOR_DOCTOR` | Junior Homeopathic Doctor | Full-time associate doctors |
| `SPECIALIST_CONSULTANT` | Specialist Homeopathic Consultant | Domain experts (requires focus below) |
| `VISITING_DOCTOR` | Visiting Doctor | Part-time / locum; limited slots & earnings UI |
| `TELEMEDICINE_DOCTOR` | Telemedicine Doctor | Remote consultations |
| `MEDICAL_INTERN` | Medical Intern | Supervised practice; no prescriptions in app nav |
| `RESIDENT_MEDICAL_OFFICER` | Resident Medical Officer (RMO) | Hospital-style resident role |

---

## Specialist focus (required for `SPECIALIST_CONSULTANT`)

| Code | Label |
|------|-------|
| `SKIN` | Skin |
| `CHILD` | Child |
| `WOMENS_HEALTH` | Women's Health |
| `CHRONIC_DISEASES` | Chronic Diseases |

When focus is set, displayed specialty defaults to e.g. **Skin Specialist** unless admin overrides the free-text specialty field.

---

## Where it is stored

Prisma model `Doctor` (`apps/api/prisma/schema/hr.prisma`):

- `doctorType` — `HomeopathicDoctorType` (default `JUNIOR_DOCTOR`)
- `specialtyFocus` — `HomeopathicSpecialtyFocus?` (only for specialists)
- `specialty` — display string (e.g. `Homeopathy`, `Skin Specialist`)
- `designation` — HR designation (optional)

Migration: `20260703170000_homeopathic_doctor_types`

---

## App behavior by type

Capabilities are defined in `apps/api/src/constants/homeopathic-doctor-types.ts` and mirrored in `doctor-web` (`doctor-types.constants.ts`).

| Type | Worklist / patients | Case analysis | Prescriptions | Slots | Earnings |
|------|---------------------|---------------|---------------|-------|----------|
| Chief Consultant | ✓ | ✓ | ✓ | ✓ | ✓ |
| Junior Doctor | ✓ | ✓ | ✓ | ✓ | ✓ |
| Specialist | ✓ | ✓ | ✓ | ✓ | ✓ |
| Visiting | ✓ | ✓ | ✓ | — | — |
| Telemedicine | ✓ | ✓ | ✓ | ✓ | ✓ |
| Medical Intern | ✓ | ✓ | — | — | — |
| RMO | ✓ | ✓ | ✓ | ✓ | ✓ |

**Note:** Nav hiding is a UX guard. API prescription rules can be tightened per type in a later phase.

---

## Admin workflow

1. Open **Admin → Doctors → Create Doctor**
2. Choose **Doctor type**
3. If **Specialist**, choose **Specialty focus**
4. Optionally override **Specialty** text
5. Save — doctor sees type badge in **Doctor Console** header after login

Self-enrollment (`POST /doctor/enroll`) defaults new applicants to **Junior Homeopathic Doctor** until admin changes the type.

---

## Doctor app UX

- **Header** — name, type badge, specialty (`doctor-shell`)
- **Profile** — read-only type/focus; doctor edits availability and contact details
- **Navigation** — tabs filtered by type (e.g. interns do not see Slots / Earnings / Appointments)

---

## API

| Endpoint | Notes |
|----------|-------|
| `GET /doctor/profile` | Returns `doctorType`, `specialtyFocus`, `doctorTypeLabel`, `specialtyFocusLabel` |
| `PUT /doctor/profile` | Doctor cannot change type (admin/HR only) |
| `POST /admin/doctors` | Accepts `doctorType`, `specialtyFocus` |
| `PUT /admin/doctors/:id` | Updates type and focus |
| `PUT /hr/doctors/:id` | HR can update `doctorType`, `specialtyFocus` |

---

## Demo account

| Field | Value |
|-------|-------|
| Email | `doctor@hopehubclinic.local` |
| Type | Chief Consultant |
| Specialty | Homeopathy |

---

## HR & joining letters

When HR saves a doctor profile or generates a joining letter, the system uses **type-specific defaults** from `apps/api/src/constants/doctor-hr-defaults.ts`:

| Doctor type | Letter subject style | Salary on letter | Consultation fee | Default probation |
|-------------|---------------------|------------------|------------------|-------------------|
| Chief Consultant | Appointment as Chief Consultant | Yes | Yes | None |
| Junior Doctor | Junior appointment | Yes | Yes | 6 months |
| Specialist | Specialist + focus area | Yes | Yes | 3 months |
| Visiting | Engagement letter | No (visit-based) | Yes | None |
| Telemedicine | Telemedicine appointment | Yes | Yes | 3 months |
| Medical Intern | Internship appointment | Yes (stipend) | No | 12 months |
| RMO | RMO appointment | Yes | Yes | 6 months |

Letters include role-specific **terms & conditions** (e.g. supervision for interns, telemedicine consent for remote doctors).

**HR apps:** `hr-web` → Doctors / Employee directory; `admin-web` → Doctor HR Records.

---

## Related files

| Area | Path |
|------|------|
| Schema | `apps/api/prisma/schema/hr.prisma` |
| Labels & validation | `apps/api/src/constants/homeopathic-doctor-types.ts` |
| HR defaults & letters | `apps/api/src/constants/doctor-hr-defaults.ts` |
| HR doctor API | `apps/api/src/routes/hr/doctors.ts` |
| Admin doctors API | `apps/api/src/routes/admin/doctors.ts` |
| Doctor shell | `apps/doctor-web/src/app/layout/doctor-shell/` |
| Doctor type constants | `apps/doctor-web/src/app/core/constants/doctor-types.constants.ts` |
| Admin UI | `apps/admin-web/src/app/features/doctors/` |

---

## Document history

| Date | Change |
|------|--------|
| 2026-07-03 | Initial doctor type taxonomy and app integration |
