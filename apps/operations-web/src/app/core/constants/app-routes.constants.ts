export const ROUTE_PATHS = {
  LOGIN: 'login',
  DASHBOARD: 'dashboard',
  EMPLOYEES: 'employees',
  DOCTORS: 'doctors',
  STORE_STAFF: 'store-staff',
  LEAVES: 'leaves',
  STORES: 'stores',
  PAYROLL: 'payroll',
  WALK_IN: 'walk-in',
  QUEUE: 'queue',
  VISITOR_LEADS: 'visitor-leads',
  CLINIC_DASHBOARD: 'clinic-dashboard',
  ROSTER: 'roster',
  SCHEDULES: 'schedules',
  FINANCE: 'finance',
  BRANCH_DASHBOARD: 'branch-dashboard',
  FOLLOW_UPS: 'follow-ups',
  PATIENTS: 'patients',
  CONSULTATIONS: 'consultations',
  FUNNELS: 'funnels',
  ORDERS: 'orders',
  WAREHOUSE: 'warehouse',
  WAREHOUSE_TRANSFERS: 'warehouse-transfers',
  PARTNER_DELIVERIES: 'partner-deliveries',
  DELIVERY_ORDERS: 'delivery-orders',
  LAB_REFERRALS: 'lab-referrals',
  ACCOUNTS: 'accounts',
  CLAIMS: 'claims',
  STORE: 'store',
  STORE_MANAGER: 'store-manager',
  SCAN: 'scan',
  ACCOUNT: 'account'
} as const;

export const STORE_COUNTER_PATHS = {
  DASHBOARD: 'dashboard',
  SEARCH: 'search',
  MEDICINES: 'medicines',
  MEDICINE_DETAIL: 'medicines/:id',
  STOCK_IN: 'stock-in',
  STOCK_OUT: 'stock-out',
  ALERTS: 'alerts',
  RACK_MAP: 'rack-map',
  MOVEMENTS: 'movements',
  STAFF_ACTIVITY: 'staff-activity',
  STAFF_HR: 'staff-hr',
  MY_PAY: 'my-pay',
  STORE_EXPENSES: 'store-expenses',
  PATIENTS: 'patients',
  PATIENT_SCAN: 'scan/patient/:patientCode'
} as const;

export const STORE_MANAGER_PATHS = {
  DASHBOARD: 'dashboard',
  SEARCH: 'search',
  MEDICINES: 'medicines',
  MEDICINE_DETAIL: 'medicines/:id',
  ALERTS: 'alerts',
  RACK_MAP: 'rack-map',
  MOVEMENTS: 'movements',
  STAFF_ACTIVITY: 'staff-activity',
  STAFF_HR: 'staff-hr',
  STORE_EXPENSES: 'store-expenses',
  PATIENTS: 'patients',
  PATIENT_SCAN: 'scan/patient/:patientCode',
  PURCHASE_ORDERS: 'purchase-orders',
  STOCK_TRANSFERS: 'stock-transfers',
  DELIVERIES: 'deliveries'
} as const;

export const DEFAULT_AUTHED_ROUTE = ROUTE_PATHS.DASHBOARD;

/** Maps child route segments to required RBAC capability ids. */
export const ROUTE_CAPABILITIES: Record<string, string | string[]> = {
  [ROUTE_PATHS.DASHBOARD]: 'hr.portal',
  [ROUTE_PATHS.EMPLOYEES]: 'hr.portal',
  [ROUTE_PATHS.DOCTORS]: 'hr.portal',
  [ROUTE_PATHS.STORE_STAFF]: 'hr.portal',
  [ROUTE_PATHS.STORES]: 'hr.portal',
  [ROUTE_PATHS.LEAVES]: 'hr.portal',
  [ROUTE_PATHS.PAYROLL]: 'hr.portal',
  [ROUTE_PATHS.WALK_IN]: 'receptionist.portal',
  [ROUTE_PATHS.QUEUE]: 'receptionist.portal',
  [ROUTE_PATHS.VISITOR_LEADS]: ['receptionist.portal', 'coordinator.portal'],
  [ROUTE_PATHS.CLINIC_DASHBOARD]: 'clinic_manager.portal',
  [ROUTE_PATHS.ROSTER]: 'clinic_manager.portal',
  [ROUTE_PATHS.SCHEDULES]: 'clinic_manager.portal',
  [ROUTE_PATHS.FINANCE]: 'accountant.portal',
  [ROUTE_PATHS.BRANCH_DASHBOARD]: 'branch_owner.portal',
  [ROUTE_PATHS.FOLLOW_UPS]: 'coordinator.portal',
  [ROUTE_PATHS.PATIENTS]: 'call_center.portal',
  [ROUTE_PATHS.CONSULTATIONS]: 'call_center.portal',
  [ROUTE_PATHS.FUNNELS]: 'marketing.portal',
  [ROUTE_PATHS.ORDERS]: 'supplier.portal',
  [ROUTE_PATHS.WAREHOUSE]: 'store_staff.portal',
  [ROUTE_PATHS.WAREHOUSE_TRANSFERS]: 'store_staff.portal',
  [ROUTE_PATHS.PARTNER_DELIVERIES]: 'delivery.ops',
  [ROUTE_PATHS.DELIVERY_ORDERS]: 'delivery.ops',
  [ROUTE_PATHS.LAB_REFERRALS]: 'diagnostic.portal',
  [ROUTE_PATHS.ACCOUNTS]: 'corporate_wellness.portal',
  [ROUTE_PATHS.CLAIMS]: 'insurance.portal',
  [ROUTE_PATHS.SCAN]: 'patient.scan'
};

/** Capability guard for nested store routes (path relative to store/ or store-manager/). */
export const STORE_COUNTER_CAPABILITIES: Record<string, string> = {
  [STORE_COUNTER_PATHS.DASHBOARD]: 'store_counter.portal',
  [STORE_COUNTER_PATHS.SEARCH]: 'store_counter.portal',
  [STORE_COUNTER_PATHS.MEDICINES]: 'store_counter.portal',
  [STORE_COUNTER_PATHS.MEDICINE_DETAIL]: 'store_counter.portal',
  [STORE_COUNTER_PATHS.STOCK_IN]: 'store.stock',
  [STORE_COUNTER_PATHS.STOCK_OUT]: 'store.stock',
  [STORE_COUNTER_PATHS.ALERTS]: 'store_counter.portal',
  [STORE_COUNTER_PATHS.RACK_MAP]: 'store_counter.portal',
  [STORE_COUNTER_PATHS.MOVEMENTS]: 'store_counter.portal',
  [STORE_COUNTER_PATHS.STAFF_ACTIVITY]: 'store_counter.portal',
  [STORE_COUNTER_PATHS.STAFF_HR]: 'store_counter.portal',
  [STORE_COUNTER_PATHS.MY_PAY]: 'store_counter.portal',
  [STORE_COUNTER_PATHS.STORE_EXPENSES]: 'store_counter.portal',
  [STORE_COUNTER_PATHS.PATIENTS]: 'store_counter.portal',
  [STORE_COUNTER_PATHS.PATIENT_SCAN]: 'store_counter.portal'
};

export const STORE_MANAGER_CAPABILITIES: Record<string, string> = {
  [STORE_MANAGER_PATHS.DASHBOARD]: 'store_manager.portal',
  [STORE_MANAGER_PATHS.SEARCH]: 'store_manager.portal',
  [STORE_MANAGER_PATHS.MEDICINES]: 'store_manager.portal',
  [STORE_MANAGER_PATHS.MEDICINE_DETAIL]: 'store_manager.portal',
  [STORE_MANAGER_PATHS.ALERTS]: 'store_manager.portal',
  [STORE_MANAGER_PATHS.RACK_MAP]: 'store_manager.portal',
  [STORE_MANAGER_PATHS.MOVEMENTS]: 'store_manager.portal',
  [STORE_MANAGER_PATHS.STAFF_ACTIVITY]: 'store_manager.portal',
  [STORE_MANAGER_PATHS.STAFF_HR]: 'store_manager.portal',
  [STORE_MANAGER_PATHS.STORE_EXPENSES]: 'store_manager.portal',
  [STORE_MANAGER_PATHS.PATIENTS]: 'store_manager.portal',
  [STORE_MANAGER_PATHS.PATIENT_SCAN]: 'store_manager.portal',
  [STORE_MANAGER_PATHS.PURCHASE_ORDERS]: 'store_manager.portal',
  [STORE_MANAGER_PATHS.STOCK_TRANSFERS]: 'store_manager.portal',
  [STORE_MANAGER_PATHS.DELIVERIES]: 'store_manager.portal'
};

