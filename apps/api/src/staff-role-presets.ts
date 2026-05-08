import { PERMISSIONS, type PermissionCode } from './staff-permissions.js';

/**
 * Groups presets by the same principle as product docs: clinical ops, PII, money,
 * facilities, insight, security; governance is called out in API metadata, not as a preset.
 */
export const PRESET_CLUSTERS = {
  clinical_operations: 'Clinical & operations (day-to-day)',
  patient_crm: 'Patient & CRM (PII-heavy)',
  commercial: 'Money & commercial',
  facilities: 'Facilities & offline clinic',
  insight: 'Insight (aggregates)',
  security: 'Security & accountability'
} as const;

export type PresetCluster = keyof typeof PRESET_CLUSTERS;

export type StaffRolePreset = {
  id: string;
  label: string;
  summary: string;
  cluster: PresetCluster;
  permissionCodes: readonly PermissionCode[];
};

/**
 * Recommended permission bundles for task-limited admins. Server enforcement is still per-code.
 * Super-admin / `admin.full` is intentionally not a preset — use `isSuperAdmin` or grant `admin.full` only for owners.
 */
export const STAFF_ROLE_PRESETS: readonly StaffRolePreset[] = [
  {
    id: 'operations_coordinator',
    label: 'Operations / care coordinator',
    summary:
      'Queues and assignments; read-only doctors and locations. Typical day-to-day coordination without catalog or money changes.',
    cluster: 'clinical_operations',
    permissionCodes: [
      PERMISSIONS.CONSULTATIONS_READ,
      PERMISSIONS.ASSIGNMENTS_WRITE,
      PERMISSIONS.DOCTORS_READ,
      PERMISSIONS.LOCATIONS_READ
    ]
  },
  {
    id: 'hr_clinician_onboarding',
    label: 'HR / clinician onboarding',
    summary: 'Onboard and approve doctors; optional locations visibility. Write access creates doctor accounts (patient-bound access).',
    cluster: 'clinical_operations',
    permissionCodes: [PERMISSIONS.DOCTORS_READ, PERMISSIONS.DOCTORS_WRITE, PERMISSIONS.LOCATIONS_READ]
  },
  {
    id: 'finance_reconciliation',
    label: 'Finance (reconciliation)',
    summary: 'Payment visibility and high-level reports. No CSV export — add the export preset only when bulk extract is required.',
    cluster: 'commercial',
    permissionCodes: [PERMISSIONS.PAYMENTS_READ, PERMISSIONS.REPORTS_VIEW]
  },
  {
    id: 'finance_with_export',
    label: 'Finance (+ CSV export)',
    summary: 'Same as finance reconciliation, plus payment CSV export (higher abuse risk; tighter headcount).',
    cluster: 'commercial',
    permissionCodes: [PERMISSIONS.PAYMENTS_READ, PERMISSIONS.PAYMENTS_EXPORT, PERMISSIONS.REPORTS_VIEW]
  },
  {
    id: 'support_light',
    label: 'Support (light)',
    summary: 'Consumer list/detail and consultation visibility for helpdesk tickets. For phone follow-up / outbound calling, use “Patient follow-up & outbound calls” — same access, clearer intent.',
    cluster: 'patient_crm',
    permissionCodes: [PERMISSIONS.CONSUMERS_READ, PERMISSIONS.CONSULTATIONS_READ]
  },
  {
    id: 'patient_followup_outreach',
    label: 'Patient follow-up & outbound calls',
    summary:
      'See patient contact details and consultation/appointment context to call for reminders, adherence, no-shows, and next steps. Read-only: no payments, catalog changes, or doctor assignment. PII-heavy — restrict to trusted coordinators.',
    cluster: 'patient_crm',
    permissionCodes: [PERMISSIONS.CONSUMERS_READ, PERMISSIONS.CONSULTATIONS_READ]
  },
  {
    id: 'compliance_security',
    label: 'Compliance / security',
    summary: 'Audit trail and read-only view of admin roster. STAFF_WRITE stays separate and minimal.',
    cluster: 'security',
    permissionCodes: [PERMISSIONS.AUDIT_READ, PERMISSIONS.STAFF_READ]
  },
  {
    id: 'product_pricing',
    label: 'Product / pricing',
    summary: 'Disease catalog and intake pricing; aggregate reports. Includes read+write on diseases.',
    cluster: 'clinical_operations',
    permissionCodes: [PERMISSIONS.DISEASES_READ, PERMISSIONS.DISEASES_WRITE, PERMISSIONS.REPORTS_VIEW]
  },
  {
    id: 'locations_manager',
    label: 'Facilities / offline clinics',
    summary: 'Maintain in-person branch list shown to patients; pair with operations preset if one person runs both.',
    cluster: 'facilities',
    permissionCodes: [PERMISSIONS.LOCATIONS_READ, PERMISSIONS.LOCATIONS_WRITE]
  }
];

export const GOVERNANCE_GUIDANCE = {
  principle: 'Split who can operate the clinic from who can change trust & money.',
  superAdmin:
    'Use isSuperAdmin or permission code admin.full only for owners — full access without enumerating every code.',
  staffWrite:
    'STAFF_WRITE can change other admins’ permissions and super-admin flags; keep to a very small group.',
  presetsAreHints:
    'Presets are recommended bundles only. The API always checks individual permission codes on each route.'
} as const;

export function getPermissionPresetsPayload() {
  return {
    clusters: PRESET_CLUSTERS,
    presets: STAFF_ROLE_PRESETS,
    governance: GOVERNANCE_GUIDANCE
  };
}
