export const DEV_DEMO_ACCOUNTS = {
  password: 'Password@123',
  otp: '123456',
  patientMobile: '9876543210',
  admin: { email: 'admin@hopehubclinic.local' },
  doctor: { email: 'doctor@hopehubclinic.local' },
  hr: { email: 'hr@hopehubclinic.local' },
  patientRahul: { email: 'patient1@hopehubclinic.local', patientCode: 'RNC-000001', name: 'Rahul Verma' },
  patientPriya: { email: 'patient2@hopehubclinic.local', patientCode: 'RNC-000002', name: 'Priya Verma' },
  storeManager: { email: 'manager@ranchi.hopehub.local' },
  storeStaff: { staffCode: 'RNC-STF1' }
} as const;
