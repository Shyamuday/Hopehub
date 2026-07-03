export const STORE_MODAL_TYPES = {
  STORE: 'store',
  EDIT: 'edit',
  MANAGER: 'manager',
  STAFF: 'staff',
  ROSTER: 'roster'
} as const;

export type StoreModalType = (typeof STORE_MODAL_TYPES)[keyof typeof STORE_MODAL_TYPES];

export const STORE_FORM_DEFAULTS = {
  MANAGER_DESIGNATION: 'Store Manager',
  STAFF_DESIGNATION: 'Store Assistant'
} as const;

export const STORE_VALIDATION = {
  PASSWORD_MIN_LENGTH: 6,
  PIN_MIN_LENGTH: 4,
  PIN_MAX_LENGTH: 8
} as const;

export const STORE_APP_PORT = 4300;

export const STORE_STATUS_COLORS = {
  ACTIVE: '#4ade80',
  INACTIVE: '#f87171'
} as const;
