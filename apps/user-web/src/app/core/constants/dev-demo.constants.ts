export const DEV_DEMO_ACCOUNTS = {
  password: 'Password@123',
  otp: '123456',
  patientMobile: '9876543210',
  admin: { email: 'admin@vitalisclinic.local' },
  doctor: { email: 'doctor@vitalisclinic.local' },
  hr: { email: 'hr@vitalisclinic.local' },
  patientRahul: { email: 'patient1@vitalisclinic.local', patientCode: 'RNC-000001', name: 'Rahul Verma' },
  patientPriya: { email: 'patient2@vitalisclinic.local', patientCode: 'RNC-000002', name: 'Priya Verma' },
  storeManager: { email: 'manager@ranchi.vitalis.local' },
  storeStaff: { staffCode: 'RNC-STF1' }
} as const;
