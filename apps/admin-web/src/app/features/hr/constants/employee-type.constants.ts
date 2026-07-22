export const EMPLOYEE_TYPES = {
  DOCTOR: 'DOCTOR',
  STORE_STAFF: 'STORE_STAFF',
} as const;

export type EmployeeType = (typeof EMPLOYEE_TYPES)[keyof typeof EMPLOYEE_TYPES];

export const EMPLOYEE_TYPE_FILTER_OPTIONS = [
  { label: 'All', value: 'ALL' },
  { label: '🩺 Providers', value: EMPLOYEE_TYPES.DOCTOR },
  { label: '🏪 Staff', value: EMPLOYEE_TYPES.STORE_STAFF },
] as const;

export const EMPLOYEE_TYPE_STAFF_FILTER_OPTIONS = [
  { label: 'All Staff', value: 'ALL' },
  { label: '🩺 Providers', value: EMPLOYEE_TYPES.DOCTOR },
  { label: '🏪 Store Staff', value: EMPLOYEE_TYPES.STORE_STAFF },
] as const;
