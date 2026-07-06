import { Role } from '@prisma/client';

export type RbacCapability = {
  id: string;
  label: string;
  description: string;
  roles: Role[];
};

export const RBAC_CAPABILITIES: RbacCapability[] = [
  {
    id: 'admin.dashboard',
    label: 'Platform dashboard',
    description: 'View cross-clinic KPIs and reports',
    roles: [Role.ADMIN]
  },
  {
    id: 'admin.doctors',
    label: 'Doctor onboarding',
    description: 'Approve, reject, and manage doctor accounts',
    roles: [Role.ADMIN]
  },
  {
    id: 'admin.consumers',
    label: 'Patient registry',
    description: 'Search and register patients platform-wide',
    roles: [Role.ADMIN, Role.HR, Role.RECEPTIONIST, Role.CLINIC_MANAGER]
  },
  {
    id: 'admin.consultations',
    label: 'Consultation ops',
    description: 'Assign doctors and override consultation status',
    roles: [Role.ADMIN, Role.RECEPTIONIST, Role.CLINIC_MANAGER]
  },
  {
    id: 'admin.finance',
    label: 'Finance & payroll',
    description: 'Revenue, expenses, outstanding payments, payslips',
    roles: [Role.ADMIN, Role.ACCOUNTANT]
  },
  {
    id: 'admin.inventory',
    label: 'Inventory oversight',
    description: 'View stock levels across branches and warehouses',
    roles: [Role.ADMIN, Role.WAREHOUSE_MANAGER]
  },
  {
    id: 'admin.catalog',
    label: 'Medicine & supplier catalog',
    description: 'Manage global medicines and suppliers',
    roles: [Role.ADMIN]
  },
  {
    id: 'admin.purchase_orders',
    label: 'Purchase orders',
    description: 'Create and track supplier purchase orders',
    roles: [Role.ADMIN, Role.WAREHOUSE_MANAGER]
  },
  {
    id: 'admin.audit',
    label: 'Audit trail',
    description: 'View and export admin action logs',
    roles: [Role.ADMIN]
  },
  {
    id: 'admin.audit_purge',
    label: 'Audit retention purge',
    description: 'Delete audit logs older than retention window',
    roles: [Role.ADMIN]
  },
  {
    id: 'admin.notifications',
    label: 'Notification broadcast',
    description: 'Manage templates and send platform broadcasts',
    roles: [Role.ADMIN]
  },
  {
    id: 'admin.users',
    label: 'Admin user management',
    description: 'Create and deactivate platform admin accounts',
    roles: [Role.ADMIN]
  },
  {
    id: 'admin.ecosystem_users',
    label: 'Ecosystem portal users',
    description: 'Create and manage branch owner, coordinator, call center, marketing, corporate, and insurance accounts',
    roles: [Role.ADMIN]
  },
  {
    id: 'admin.portal_users',
    label: 'Staff & partner portal users',
    description: 'Create receptionist, clinic manager, accountant, supplier, warehouse, delivery, and diagnostic accounts',
    roles: [Role.ADMIN]
  },
  {
    id: 'hr.portal',
    label: 'HR portal',
    description: 'Doctor onboarding, employees, leaves, and payroll',
    roles: [Role.HR, Role.ADMIN]
  },
  {
    id: 'branch_owner.portal',
    label: 'Branch owner portal',
    description: 'Branch P&L and operations dashboard',
    roles: [Role.BRANCH_OWNER, Role.ADMIN]
  },
  {
    id: 'coordinator.portal',
    label: 'Patient coordinator portal',
    description: 'Adherence follow-ups for assigned branch patients',
    roles: [Role.PATIENT_COORDINATOR, Role.ADMIN]
  },
  {
    id: 'call_center.portal',
    label: 'Call center portal',
    description: 'Patient lookup and recent consultation context',
    roles: [Role.CALL_CENTER, Role.ADMIN]
  },
  {
    id: 'marketing.portal',
    label: 'Marketing portal',
    description: 'Read-only product funnel analytics',
    roles: [Role.MARKETING, Role.ADMIN]
  },
  {
    id: 'corporate_wellness.portal',
    label: 'Corporate wellness portal',
    description: 'Corporate accounts and employee enrollments',
    roles: [Role.CORPORATE_WELLNESS, Role.ADMIN]
  },
  {
    id: 'insurance.portal',
    label: 'Insurance partner portal',
    description: 'Insurance claims submission and tracking',
    roles: [Role.INSURANCE_PARTNER, Role.ADMIN]
  },
  {
    id: 'receptionist.portal',
    label: 'Receptionist portal',
    description: 'Walk-ins, queue, and consultation scheduling',
    roles: [Role.RECEPTIONIST, Role.ADMIN]
  },
  {
    id: 'clinic_manager.portal',
    label: 'Clinic manager portal',
    description: 'Branch operations and staff oversight',
    roles: [Role.CLINIC_MANAGER, Role.ADMIN]
  },
  {
    id: 'accountant.portal',
    label: 'Accountant portal',
    description: 'Finance summaries and expense tracking',
    roles: [Role.ACCOUNTANT, Role.ADMIN]
  },
  {
    id: 'store_staff.portal',
    label: 'Store staff portal',
    description: 'Dispense medicines and manage branch stock',
    roles: [Role.WAREHOUSE_MANAGER, Role.ADMIN]
  },
  {
    id: 'store_counter.portal',
    label: 'Store counter',
    description: 'Branch dispensary counter — search, dispense, and stock',
    roles: []
  },
  {
    id: 'store_manager.portal',
    label: 'Store manager portal',
    description: 'Multi-branch stock oversight for store managers',
    roles: [Role.WAREHOUSE_MANAGER, Role.ADMIN]
  },
  {
    id: 'store.stock',
    label: 'Branch stock operations',
    description: 'Add, remove, and adjust medicine stock at a store',
    roles: [Role.WAREHOUSE_MANAGER]
  },
  {
    id: 'patient.scan',
    label: 'Patient QR scan',
    description: 'Scan patient card QR or enter patient ID to open the right workflow',
    roles: [
      Role.DOCTOR,
      Role.ADMIN,
      Role.HR,
      Role.RECEPTIONIST,
      Role.CLINIC_MANAGER,
      Role.CALL_CENTER,
      Role.PATIENT_COORDINATOR,
      Role.WAREHOUSE_MANAGER,
      Role.PATIENT
    ]
  },
  {
    id: 'doctor.consult',
    label: 'Doctor consultations',
    description: 'Conduct consultations and prescribe',
    roles: [Role.DOCTOR]
  },
  {
    id: 'patient.app',
    label: 'Patient mobile app',
    description: 'Book consultations, chat, and dose reminders',
    roles: [Role.PATIENT]
  },
  {
    id: 'supplier.portal',
    label: 'Supplier portal',
    description: 'Fulfill purchase orders and update dispatch',
    roles: [Role.SUPPLIER]
  },
  {
    id: 'delivery.ops',
    label: 'Medicine delivery',
    description: 'Assign and complete medicine deliveries',
    roles: [Role.DELIVERY_EXECUTIVE]
  },
  {
    id: 'diagnostic.portal',
    label: 'Diagnostic partner portal',
    description: 'Receive and update lab referral status',
    roles: [Role.DIAGNOSTIC_PARTNER]
  }
];

export const RBAC_ROLES = Object.values(Role);
