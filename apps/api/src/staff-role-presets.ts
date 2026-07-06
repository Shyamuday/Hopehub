import { PERMISSIONS, type PermissionCode } from './staff-permissions.js';

export const PRESET_CLUSTERS = {
  clinical_operations: 'Clinical & operations',
  patient_crm: 'Patient & CRM',
  commercial: 'Finance & commercial',
  facilities: 'Facilities',
  insight: 'Insight & reports',
  security: 'Security & governance',
  ops_portals: 'Operations portal access'
} as const;

export type PresetCluster = keyof typeof PRESET_CLUSTERS;

export type StaffRolePreset = {
  id: string;
  label: string;
  summary: string;
  cluster: PresetCluster;
  permissionCodes: readonly PermissionCode[];
};

export const STAFF_ROLE_PRESETS: readonly StaffRolePreset[] = [
  {
    id: 'operations_coordinator',
    label: 'Operations coordinator',
    summary: 'Consultations, assignments, read doctors.',
    cluster: 'clinical_operations',
    permissionCodes: [
      PERMISSIONS.CONSULTATIONS_READ,
      PERMISSIONS.ASSIGNMENTS_WRITE,
      PERMISSIONS.DOCTORS_READ,
      PERMISSIONS.OPS_RECEPTIONIST
    ]
  },
  {
    id: 'hr_clinician_onboarding',
    label: 'HR / clinician onboarding',
    summary: 'Onboard doctors; HR ops portal.',
    cluster: 'clinical_operations',
    permissionCodes: [
      PERMISSIONS.DOCTORS_READ,
      PERMISSIONS.DOCTORS_WRITE,
      PERMISSIONS.OPS_HR,
      PERMISSIONS.STAFF_READ
    ]
  },
  {
    id: 'hr_permissions_manager',
    label: 'HR permissions manager',
    summary: 'Assign permissions to staff; HR ops portal.',
    cluster: 'security',
    permissionCodes: [PERMISSIONS.STAFF_READ, PERMISSIONS.STAFF_WRITE, PERMISSIONS.OPS_HR]
  },
  {
    id: 'finance_reconciliation',
    label: 'Finance (read-only)',
    summary: 'Payments and reports.',
    cluster: 'commercial',
    permissionCodes: [PERMISSIONS.PAYMENTS_READ, PERMISSIONS.REPORTS_VIEW, PERMISSIONS.OPS_ACCOUNTANT]
  },
  {
    id: 'finance_with_export',
    label: 'Finance (+ export)',
    summary: 'Payments, reports, CSV export.',
    cluster: 'commercial',
    permissionCodes: [
      PERMISSIONS.PAYMENTS_READ,
      PERMISSIONS.PAYMENTS_EXPORT,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.OPS_ACCOUNTANT
    ]
  },
  {
    id: 'support_light',
    label: 'Support (light)',
    summary: 'Consumer lookup and consultations.',
    cluster: 'patient_crm',
    permissionCodes: [PERMISSIONS.CONSUMERS_READ, PERMISSIONS.CONSULTATIONS_READ, PERMISSIONS.OPS_CALL_CENTER]
  },
  {
    id: 'compliance_security',
    label: 'Compliance / security',
    summary: 'Audit trail and staff roster (read).',
    cluster: 'security',
    permissionCodes: [PERMISSIONS.AUDIT_READ, PERMISSIONS.STAFF_READ]
  },
  {
    id: 'product_pricing',
    label: 'Product / pricing',
    summary: 'Disease catalog and reports.',
    cluster: 'clinical_operations',
    permissionCodes: [PERMISSIONS.DISEASES_READ, PERMISSIONS.DISEASES_WRITE, PERMISSIONS.REPORTS_VIEW]
  },
  {
    id: 'store_ops',
    label: 'Store operations',
    summary: 'Inventory, catalog, store counter & manager portals.',
    cluster: 'ops_portals',
    permissionCodes: [
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.CATALOG_READ,
      PERMISSIONS.OPS_STORE_COUNTER,
      PERMISSIONS.OPS_STORE_MANAGER,
      PERMISSIONS.OPS_WAREHOUSE
    ]
  }
];

export const GOVERNANCE_GUIDANCE = {
  principle: 'Assign only the powers each email needs — admins and HR can combine multiple permission codes per user.',
  superAdmin: 'Use Super admin only for platform owners.',
  staffWrite: 'admin.staff.write lets HR or admins change other users’ permissions.',
  presetsAreHints: 'Presets are starting bundles; you can tick any combination before save.'
} as const;

export function getPermissionPresetsPayload() {
  return {
    clusters: PRESET_CLUSTERS,
    presets: STAFF_ROLE_PRESETS,
    governance: GOVERNANCE_GUIDANCE,
    allPermissions: Object.entries(PERMISSIONS).map(([key, code]) => ({
      code,
      key,
      label: code
    }))
  };
}
