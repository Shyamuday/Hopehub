import { SERVER_CONFIG } from '../constants/config.constants.js';

export const DEV_DEMO_PASSWORD = 'Password@123';
export const DEV_DEMO_OTP = SERVER_CONFIG.DEV_OTP;
export const DEV_PATIENT_MOBILE = '9876543210';

export const DEV_DEMO_ACCOUNTS = {
  admin: {
    email: 'admin@hopehubclinic.local',
    name: 'Clinic Admin'
  },
  doctor: {
    email: 'doctor@hopehubclinic.local',
    name: 'Dr. Meera Sharma',
    mobile: '9000000001',
    specialty: 'Homeopathy',
    registrationNo: 'MCI-DEMO-001',
    doctorType: 'CHIEF_CONSULTANT'
  },
  hr: {
    email: 'hr@hopehubclinic.local',
    name: 'HR Manager Demo',
    employeeId: 'HR-001'
  },
  receptionist: {
    email: 'reception@hopehubclinic.local',
    name: 'Front Desk Demo',
    employeeId: 'REC-001'
  },
  clinicManager: {
    email: 'clinic@hopehubclinic.local',
    name: 'Branch Manager Demo',
    employeeId: 'CM-001'
  },
  accountant: {
    email: 'accountant@hopehubclinic.local',
    name: 'Finance Accountant Demo',
    employeeId: 'ACC-001'
  },
  supplier: {
    email: 'supplier@hopehubclinic.local',
    name: 'HopeHub Pharma Supplies',
    code: 'VPS',
    employeeId: 'SUP-001'
  },
  warehouse: {
    email: 'warehouse@hopehubclinic.local',
    name: 'Central Warehouse Manager',
    code: 'WH',
    employeeId: 'WH-001'
  },
  delivery: {
    email: 'delivery@hopehubclinic.local',
    name: 'Ranchi Delivery Executive',
    employeeId: 'DEL-001'
  },
  diagnostic: {
    email: 'lab@hopehubclinic.local',
    name: 'HopeHub Diagnostics Lab',
    code: 'VDL',
    employeeId: 'LAB-001'
  },
  branchOwner: {
    email: 'owner@hopehubclinic.local',
    name: 'Ranchi Branch Owner',
    employeeId: 'OWN-001'
  },
  coordinator: {
    email: 'coordinator@hopehubclinic.local',
    name: 'Patient Coordinator Demo',
    employeeId: 'PCO-001'
  },
  callCenter: {
    email: 'callcenter@hopehubclinic.local',
    name: 'Call Center Agent Demo',
    employeeId: 'CC-001'
  },
  marketing: {
    email: 'marketing@hopehubclinic.local',
    name: 'Marketing Manager Demo',
    employeeId: 'MKT-001'
  },
  corporate: {
    email: 'corporate@hopehubclinic.local',
    name: 'Acme Corp Wellness',
    code: 'ACME'
  },
  insurance: {
    email: 'insurance@hopehubclinic.local',
    name: 'HopeHub Insurance Desk',
    companyName: 'HopeHub Health Insurance',
    companyCode: 'VHI'
  },
  patientRahul: {
    email: 'patient1@hopehubclinic.local',
    name: 'Rahul Verma',
    patientCode: 'RNC-000001'
  },
  patientPriya: {
    email: 'patient2@hopehubclinic.local',
    name: 'Priya Verma',
    patientCode: 'RNC-000002'
  },
  store: {
    code: 'RNC',
    name: 'HopeHub Care — Ranchi',
    address: 'Ranchi, Jharkhand'
  },
  warehouseStore: {
    code: 'WH',
    name: 'HopeHub Central Warehouse — Kolkata',
    address: 'Kolkata, West Bengal'
  },
  storeManager: {
    email: 'manager@ranchi.hopehub.local',
    name: 'Ranchi Store Manager',
    staffCode: 'RNC-MGR'
  },
  storeStaff: {
    name: 'Counter Staff Demo',
    staffCode: 'RNC-STF1',
    email: 'staff@ranchi.hopehub.local'
  }
} as const;

export const DEV_SEED_IDS = {
  consultationRahul: 'seed-consultation-rahul',
  consultationPriya: 'seed-consultation-priya-assigned',
  supportNoteRahul: 'seed-support-note-rahul'
} as const;
