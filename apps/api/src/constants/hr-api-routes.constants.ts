export const HR_API_ROUTES = {
  AUTH_LOGIN: '/auth/login',
  AUTH_ME: '/auth/me',
  DASHBOARD: '/dashboard',
  EMPLOYEES: '/employees',
  DOCTORS: '/doctors',
  DOCTOR_BY_ID: '/doctors/:id',
  DOCTOR_LETTER: '/doctors/:id/letter',
  DOCTOR_ASSIGNMENT: '/doctors/:id/assignment',
  STORE_STAFF: '/store/staff',
  STORE_STAFF_BY_ID: '/store/staff/:id',
  STORE_STAFF_STATUS: '/store/staff/:id/status',
  LEAVES: '/leaves',
  LEAVE_BY_ID: '/leaves/:id',
  STORES: '/stores',
  STORE_MANAGERS: '/stores/:storeId/managers',
  STORE_STAFF_CREATE: '/stores/:storeId/staff',
  USERS: '/users',
  USER_STATUS: '/users/:id/status',
  USER_STORES: '/users/:id/stores',
  USER_STORE_BY_ID: '/users/:id/stores/:storeId',
  USER_STORES_ALL: '/users/:id/stores/all',
  PAYROLL: '/payroll',
  SELF_DOCTOR_LEAVE: '/self/doctor-leave',
  SELF_STAFF_LEAVE: '/self/staff-leave',
  SELF_DOCTOR_LEAVES: '/self/doctor-leaves'
} as const;

export const HR_ROLES = {
  ADMIN: 'ADMIN',
  HR: 'HR',
  MANAGER: 'MANAGER'
} as const;

export const HR_DEFAULT_PAGE_SIZE = 20;
