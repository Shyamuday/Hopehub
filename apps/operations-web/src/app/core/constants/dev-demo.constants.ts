/** Mirrors apps/api/src/dev/demo-manifest.ts — keep in sync for dev helpers. */
export const DEV_DEMO_ACCOUNTS = {
  password: 'Password@123',
  otp: '123456',
  deliveryOtp: '123456',
  patientMobile: '9876543210',
  hr: { email: 'hr@hopehubclinic.local' },
  receptionist: { email: 'reception@hopehubclinic.local' },
  clinicManager: { email: 'clinic@hopehubclinic.local' },
  accountant: { email: 'accountant@hopehubclinic.local' },
  supplier: { email: 'supplier@hopehubclinic.local' },
  warehouse: { email: 'warehouse@hopehubclinic.local' },
  delivery: { email: 'delivery@hopehubclinic.local' },
  diagnostic: { email: 'lab@hopehubclinic.local' },
  branchOwner: { email: 'owner@hopehubclinic.local' },
  coordinator: { email: 'coordinator@hopehubclinic.local' },
  callCenter: { email: 'callcenter@hopehubclinic.local' },
  marketing: { email: 'marketing@hopehubclinic.local' },
  corporate: { email: 'corporate@hopehubclinic.local' },
  insurance: { email: 'insurance@hopehubclinic.local' },
  storeManager: { email: 'manager@ranchi.hopehub.local' },
  storeStaff: { email: 'staff@ranchi.hopehub.local', staffCode: 'RNC-STF1' }
} as const;
