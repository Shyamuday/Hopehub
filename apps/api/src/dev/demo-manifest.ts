import { SERVER_CONFIG } from '../constants/config.constants.js';

export const DEV_DEMO_PASSWORD = 'Password@123';
export const DEV_DEMO_OTP = SERVER_CONFIG.DEV_OTP;
export const DEV_PATIENT_MOBILE = '9876543210';

export const DEV_DEMO_ACCOUNTS = {
  admin: {
    email: 'admin@vitalisclinic.local',
    name: 'Clinic Admin'
  },
  doctor: {
    email: 'doctor@vitalisclinic.local',
    name: 'Dr. Meera Sharma',
    mobile: '9000000001',
    specialty: 'Homeopathy',
    registrationNo: 'MCI-DEMO-001',
    doctorType: 'CHIEF_CONSULTANT'
  },
  hr: {
    email: 'hr@vitalisclinic.local',
    name: 'HR Manager Demo',
    employeeId: 'HR-001'
  },
  receptionist: {
    email: 'reception@vitalisclinic.local',
    name: 'Front Desk Demo',
    employeeId: 'REC-001'
  },
  clinicManager: {
    email: 'clinic@vitalisclinic.local',
    name: 'Branch Manager Demo',
    employeeId: 'CM-001'
  },
  accountant: {
    email: 'accountant@vitalisclinic.local',
    name: 'Finance Accountant Demo',
    employeeId: 'ACC-001'
  },
  supplier: {
    email: 'supplier@vitalisclinic.local',
    name: 'Vitalis Pharma Supplies',
    code: 'VPS',
    employeeId: 'SUP-001'
  },
  warehouse: {
    email: 'warehouse@vitalisclinic.local',
    name: 'Central Warehouse Manager',
    code: 'WH',
    employeeId: 'WH-001'
  },
  delivery: {
    email: 'delivery@vitalisclinic.local',
    name: 'Ranchi Delivery Executive',
    employeeId: 'DEL-001'
  },
  diagnostic: {
    email: 'lab@vitalisclinic.local',
    name: 'Vitalis Diagnostics Lab',
    code: 'VDL',
    employeeId: 'LAB-001'
  },
  patientRahul: {
    email: 'patient1@vitalisclinic.local',
    name: 'Rahul Verma',
    patientCode: 'RNC-000001'
  },
  patientPriya: {
    email: 'patient2@vitalisclinic.local',
    name: 'Priya Verma',
    patientCode: 'RNC-000002'
  },
  store: {
    code: 'RNC',
    name: 'Vitalis Care — Ranchi',
    address: 'Ranchi, Jharkhand'
  },
  warehouseStore: {
    code: 'WH',
    name: 'Vitalis Central Warehouse — Kolkata',
    address: 'Kolkata, West Bengal'
  },
  storeManager: {
    email: 'manager@ranchi.vitalis.local',
    name: 'Ranchi Store Manager',
    staffCode: 'RNC-MGR'
  },
  storeStaff: {
    name: 'Counter Staff Demo',
    staffCode: 'RNC-STF1'
  }
} as const;

export const DEV_SEED_IDS = {
  consultationRahul: 'seed-consultation-rahul',
  consultationPriya: 'seed-consultation-priya-assigned',
  supportNoteRahul: 'seed-support-note-rahul'
} as const;

export const DEV_DEMO_APPS = [
  { id: 'user-web', label: 'Patient app', port: 4200, url: SERVER_CONFIG.ORIGINS.WEB },
  { id: 'admin-web', label: 'Admin console', port: 4201, url: SERVER_CONFIG.ORIGINS.ADMIN },
  { id: 'doctor-web', label: 'Doctor app', port: 4202, url: SERVER_CONFIG.ORIGINS.DOCTOR },
  { id: 'store', label: 'Store staff', port: 4300, url: SERVER_CONFIG.ORIGINS.STORE },
  { id: 'store-manager-web', label: 'Store manager', port: 4301, url: SERVER_CONFIG.ORIGINS.STORE_MANAGER },
  { id: 'hr-web', label: 'HR portal', port: 4400, url: SERVER_CONFIG.ORIGINS.HR },
  { id: 'receptionist-web', label: 'Reception desk', port: 4500, url: SERVER_CONFIG.ORIGINS.RECEPTIONIST },
  { id: 'clinic-manager-web', label: 'Clinic manager', port: 4600, url: SERVER_CONFIG.ORIGINS.CLINIC_MANAGER },
  { id: 'accountant-web', label: 'Accountant', port: 4700, url: SERVER_CONFIG.ORIGINS.ACCOUNTANT },
  { id: 'supplier-web', label: 'Supplier portal', port: 4800, url: SERVER_CONFIG.ORIGINS.SUPPLIER },
  { id: 'warehouse-web', label: 'Warehouse hub', port: 4900, url: SERVER_CONFIG.ORIGINS.WAREHOUSE },
  { id: 'delivery-web', label: 'Delivery executive', port: 5000, url: SERVER_CONFIG.ORIGINS.DELIVERY },
  { id: 'diagnostic-web', label: 'Diagnostic center', port: 5100, url: SERVER_CONFIG.ORIGINS.DIAGNOSTIC },
  { id: 'api', label: 'API + demo guide', port: 4000, url: SERVER_CONFIG.API_PUBLIC_URL }
] as const;

export type DevDemoAuthKind = 'platform' | 'hr' | 'store-pin' | 'store-manager';

export type DevDemoPersona = {
  id: string;
  label: string;
  app: string;
  authKind: DevDemoAuthKind;
  description: string;
  testHints: string[];
};

export const DEV_DEMO_PERSONAS: DevDemoPersona[] = [
  {
    id: 'admin',
    label: 'Clinic Admin',
    app: 'admin-web',
    authKind: 'platform',
    description: 'Full admin console — doctors, consumers, finance, audit.',
    testHints: ['Assign doctors', 'Payments export', 'Adherence cohorts', 'Support notes']
  },
  {
    id: 'doctor',
    label: 'Dr. Meera Sharma',
    app: 'doctor-web',
    authKind: 'platform',
    description: 'Assigned dermatologist with active consults and follow-ups.',
    testHints: ['Worklist', 'Prescribe & publish', 'Patient scan', 'PDF export']
  },
  {
    id: 'patient-rahul',
    label: 'Rahul Verma (RNC-000001)',
    app: 'user-web',
    authKind: 'platform',
    description: 'Primary demo patient — in-progress consult, published Rx, low adherence.',
    testHints: ['Today medicines', 'Dose take/skip', 'Prescription PDF', 'Reminder prefs']
  },
  {
    id: 'patient-priya',
    label: 'Priya Verma (RNC-000002)',
    app: 'user-web',
    authKind: 'platform',
    description: 'Second profile on shared mobile — assigned consult, lighter history.',
    testHints: ['Patient selection flow', 'Book new consult', 'Payment checkout']
  },
  {
    id: 'hr',
    label: 'HR Manager',
    app: 'hr-web',
    authKind: 'hr',
    description: 'HR portal for employees, leaves, and payroll.',
    testHints: ['Employee roster', 'Leave approvals', 'Doctor HR records']
  },
  {
    id: 'receptionist',
    label: 'Front Desk (Ranchi)',
    app: 'receptionist-web',
    authKind: 'platform',
    description: 'Walk-in registration, queue, cash collection, doctor assignment.',
    testHints: ['Walk-in patient', 'Queue board', 'Collect cash', 'Assign doctor']
  },
  {
    id: 'clinic-manager',
    label: 'Branch Manager (Ranchi)',
    app: 'clinic-manager-web',
    authKind: 'platform',
    description: 'Branch operations dashboard — KPIs, staff roster, doctor schedules.',
    testHints: ['Today KPIs', 'Queue snapshot', 'Staff attendance', 'Doctor slots']
  },
  {
    id: 'accountant',
    label: 'Finance Accountant',
    app: 'accountant-web',
    authKind: 'platform',
    description: 'GST-ready branch P&L, month summary, and accountant CSV export bundle.',
    testHints: ['Month summary', 'Branch P&L table', 'Export bundle CSV']
  },
  {
    id: 'supplier',
    label: 'Vitalis Pharma Supplies',
    app: 'supplier-web',
    authKind: 'platform',
    description: 'View purchase orders and confirm dispatch to clinic stores.',
    testHints: ['Open sent PO', 'Confirm delivery date', 'Store manager posts GRN']
  },
  {
    id: 'warehouse',
    label: 'Central Warehouse (Kolkata)',
    app: 'warehouse-web',
    authKind: 'platform',
    description: 'Central stock hub — create transfers and dispatch to branch stores.',
    testHints: ['Dashboard stock', 'Create transfer to Ranchi', 'Dispatch with batch', 'Branch receives transfer']
  },
  {
    id: 'delivery',
    label: 'Ranchi Delivery Executive',
    app: 'delivery-web',
    authKind: 'platform',
    description: 'Last-mile home medicine delivery with OTP proof of delivery.',
    testHints: ['Accept pending order', 'Pick up from store', 'Complete with OTP 123456']
  },
  {
    id: 'diagnostic',
    label: 'Vitalis Diagnostics Lab',
    app: 'diagnostic-web',
    authKind: 'platform',
    description: 'External lab partner — accept referrals and publish test results.',
    testHints: ['Open sent referral', 'Accept & schedule', 'Submit CBC/thyroid results']
  },
  {
    id: 'store-staff',
    label: 'Counter Staff (RNC-STF1)',
    app: 'store',
    authKind: 'store-pin',
    description: 'Store counter PIN login for dispensing.',
    testHints: ['Patient scan', 'Medicine lookup', 'Stock counter']
  },
  {
    id: 'store-manager',
    label: 'Ranchi Store Manager',
    app: 'store-manager-web',
    authKind: 'store-manager',
    description: 'Store manager dashboard for inventory and staff.',
    testHints: ['Inventory', 'Home deliveries', 'Incoming POs', 'Stock transfers']
  }
];

export const DEV_DEMO_SCENARIOS = [
  {
    id: 'rahul-journey',
    title: 'Rahul — full patient journey',
    steps: [
      'Login as Rahul in patient app',
      'View today medicines and mark a dose taken',
      'Open prescription history → view/download PDF',
      'Switch to doctor app → see Rahul on worklist',
      'Admin app → Consumers → Rahul → Support tab'
    ]
  },
  {
    id: 'ops-review',
    title: 'Admin ops review',
    steps: [
      'Login as admin',
      'Payments → filter/export CSV',
      'Adherence Risk → high-risk cohort',
      'Product Analytics → funnel table',
      'Audit trail → recent actions'
    ]
  },
  {
    id: 'store-scan',
    title: 'Store scan flow',
    steps: [
      'Seed creates patient RNC-000001',
      'Login as store staff (PIN)',
      'Scan or open http://localhost:4000/go/p/RNC-000001',
      'Verify patient card and prescription context'
    ]
  }
];

export type DevDemoPersonaCredentials = {
  email?: string;
  identifier?: string;
  password: string;
  mobile?: string;
  otp?: string;
  name?: string;
  staffCode?: string;
  pin?: string;
};

export type DevDemoPersonaWithCredentials = DevDemoPersona & {
  credentials: DevDemoPersonaCredentials;
  loginLabel: string;
};

export const DEV_DEMO_ALL_ACCOUNTS = [
  { role: 'Admin', app: 'admin-web', login: DEV_DEMO_ACCOUNTS.admin.email, password: DEV_DEMO_PASSWORD },
  { role: 'Doctor', app: 'doctor-web', login: DEV_DEMO_ACCOUNTS.doctor.email, password: DEV_DEMO_PASSWORD },
  { role: 'HR', app: 'hr-web', login: DEV_DEMO_ACCOUNTS.hr.email, password: DEV_DEMO_PASSWORD },
  {
    role: 'Receptionist',
    app: 'receptionist-web',
    login: DEV_DEMO_ACCOUNTS.receptionist.email,
    password: DEV_DEMO_PASSWORD
  },
  {
    role: 'Clinic manager',
    app: 'clinic-manager-web',
    login: DEV_DEMO_ACCOUNTS.clinicManager.email,
    password: DEV_DEMO_PASSWORD
  },
  {
    role: 'Accountant',
    app: 'accountant-web',
    login: DEV_DEMO_ACCOUNTS.accountant.email,
    password: DEV_DEMO_PASSWORD
  },
  {
    role: 'Supplier',
    app: 'supplier-web',
    login: DEV_DEMO_ACCOUNTS.supplier.email,
    password: DEV_DEMO_PASSWORD
  },
  {
    role: 'Warehouse manager',
    app: 'warehouse-web',
    login: DEV_DEMO_ACCOUNTS.warehouse.email,
    password: DEV_DEMO_PASSWORD
  },
  {
    role: 'Delivery executive',
    app: 'delivery-web',
    login: DEV_DEMO_ACCOUNTS.delivery.email,
    password: DEV_DEMO_PASSWORD
  },
  {
    role: 'Diagnostic lab partner',
    app: 'diagnostic-web',
    login: DEV_DEMO_ACCOUNTS.diagnostic.email,
    password: DEV_DEMO_PASSWORD
  },
  {
    role: 'Patient — Rahul',
    app: 'user-web',
    login: DEV_DEMO_ACCOUNTS.patientRahul.email,
    password: DEV_DEMO_PASSWORD,
    mobile: DEV_PATIENT_MOBILE,
    otp: DEV_DEMO_OTP
  },
  {
    role: 'Patient — Priya',
    app: 'user-web',
    login: DEV_DEMO_ACCOUNTS.patientPriya.email,
    password: DEV_DEMO_PASSWORD,
    mobile: DEV_PATIENT_MOBILE,
    otp: DEV_DEMO_OTP
  },
  {
    role: 'Store manager',
    app: 'store-manager-web',
    login: DEV_DEMO_ACCOUNTS.storeManager.email,
    password: DEV_DEMO_PASSWORD
  },
  {
    role: 'Store staff',
    app: 'store',
    login: DEV_DEMO_ACCOUNTS.storeStaff.staffCode,
    password: DEV_DEMO_PASSWORD,
    note: 'Use as Staff ID; PIN is the password'
  }
] as const;

const PERSONA_EMAIL: Record<string, string> = {
  admin: DEV_DEMO_ACCOUNTS.admin.email,
  doctor: DEV_DEMO_ACCOUNTS.doctor.email,
  'patient-rahul': DEV_DEMO_ACCOUNTS.patientRahul.email,
  'patient-priya': DEV_DEMO_ACCOUNTS.patientPriya.email,
  hr: DEV_DEMO_ACCOUNTS.hr.email,
  receptionist: DEV_DEMO_ACCOUNTS.receptionist.email,
  'clinic-manager': DEV_DEMO_ACCOUNTS.clinicManager.email,
  accountant: DEV_DEMO_ACCOUNTS.accountant.email,
  supplier: DEV_DEMO_ACCOUNTS.supplier.email,
  warehouse: DEV_DEMO_ACCOUNTS.warehouse.email,
  delivery: DEV_DEMO_ACCOUNTS.delivery.email,
  diagnostic: DEV_DEMO_ACCOUNTS.diagnostic.email
};

export function getPersonaCredentials(personaId: string): DevDemoPersonaCredentials {
  const password = DEV_DEMO_PASSWORD;
  const otp = DEV_DEMO_OTP;

  switch (personaId) {
    case 'admin':
      return { email: DEV_DEMO_ACCOUNTS.admin.email, password };
    case 'doctor':
      return { email: DEV_DEMO_ACCOUNTS.doctor.email, password };
    case 'patient-rahul':
      return {
        email: DEV_DEMO_ACCOUNTS.patientRahul.email,
        identifier: DEV_DEMO_ACCOUNTS.patientRahul.email,
        password,
        mobile: DEV_PATIENT_MOBILE,
        otp,
        name: DEV_DEMO_ACCOUNTS.patientRahul.name
      };
    case 'patient-priya':
      return {
        email: DEV_DEMO_ACCOUNTS.patientPriya.email,
        identifier: DEV_DEMO_ACCOUNTS.patientPriya.email,
        password,
        mobile: DEV_PATIENT_MOBILE,
        otp,
        name: DEV_DEMO_ACCOUNTS.patientPriya.name
      };
    case 'hr':
      return { email: DEV_DEMO_ACCOUNTS.hr.email, password };
    case 'receptionist':
      return { email: DEV_DEMO_ACCOUNTS.receptionist.email, password };
    case 'clinic-manager':
      return { email: DEV_DEMO_ACCOUNTS.clinicManager.email, password };
    case 'accountant':
      return { email: DEV_DEMO_ACCOUNTS.accountant.email, password };
    case 'supplier':
      return { email: DEV_DEMO_ACCOUNTS.supplier.email, password };
    case 'warehouse':
      return { email: DEV_DEMO_ACCOUNTS.warehouse.email, password };
    case 'delivery':
      return { email: DEV_DEMO_ACCOUNTS.delivery.email, password };
    case 'diagnostic':
      return { email: DEV_DEMO_ACCOUNTS.diagnostic.email, password };
    case 'store-staff':
      return { staffCode: DEV_DEMO_ACCOUNTS.storeStaff.staffCode, pin: password, password };
    case 'store-manager':
      return { email: DEV_DEMO_ACCOUNTS.storeManager.email, password };
    default:
      return { password };
  }
}

export function getPersonaLoginLabel(personaId: string) {
  const credentials = getPersonaCredentials(personaId);
  return credentials.email ?? credentials.identifier ?? credentials.staffCode ?? personaId;
}

export function personasWithCredentialsForApp(appId: string): DevDemoPersonaWithCredentials[] {
  return personasForApp(appId).map((persona) => ({
    ...persona,
    credentials: getPersonaCredentials(persona.id),
    loginLabel: getPersonaLoginLabel(persona.id)
  }));
}

export function isDevDemoEnabled() {
  return process.env.NODE_ENV !== 'production' && process.env.DISABLE_DEV_DEMO !== 'true';
}

export function getPersonaById(id: string) {
  return DEV_DEMO_PERSONAS.find((persona) => persona.id === id);
}

export function getPersonaEmail(personaId: string) {
  return PERSONA_EMAIL[personaId];
}

export function personasForApp(appId: string) {
  return DEV_DEMO_PERSONAS.filter((persona) => persona.app === appId);
}
