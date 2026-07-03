import { ROUTE_PATHS } from './app-routes.constants';

export const HOMEOPATHIC_DOCTOR_TYPES = [
  'CHIEF_CONSULTANT',
  'JUNIOR_DOCTOR',
  'SPECIALIST_CONSULTANT',
  'VISITING_DOCTOR',
  'TELEMEDICINE_DOCTOR',
  'MEDICAL_INTERN',
  'RESIDENT_MEDICAL_OFFICER'
] as const;

export type HomeopathicDoctorType = (typeof HOMEOPATHIC_DOCTOR_TYPES)[number];

export const HOMEOPATHIC_SPECIALTY_FOCUSES = ['SKIN', 'CHILD', 'WOMENS_HEALTH', 'CHRONIC_DISEASES'] as const;

export type HomeopathicSpecialtyFocus = (typeof HOMEOPATHIC_SPECIALTY_FOCUSES)[number];

export const DOCTOR_TYPE_LABELS: Record<HomeopathicDoctorType, string> = {
  CHIEF_CONSULTANT: 'Homeopathic Doctor (Chief Consultant)',
  JUNIOR_DOCTOR: 'Junior Homeopathic Doctor',
  SPECIALIST_CONSULTANT: 'Specialist Homeopathic Consultant',
  VISITING_DOCTOR: 'Visiting Doctor',
  TELEMEDICINE_DOCTOR: 'Telemedicine Doctor',
  MEDICAL_INTERN: 'Medical Intern',
  RESIDENT_MEDICAL_OFFICER: 'Resident Medical Officer (RMO)'
};

export const SPECIALTY_FOCUS_LABELS: Record<HomeopathicSpecialtyFocus, string> = {
  SKIN: 'Skin',
  CHILD: 'Child',
  WOMENS_HEALTH: "Women's Health",
  CHRONIC_DISEASES: 'Chronic Diseases'
};

export type DoctorProfileSummary = {
  specialty?: string;
  registrationNo?: string | null;
  isAvailable?: boolean;
  doctorType?: HomeopathicDoctorType;
  specialtyFocus?: HomeopathicSpecialtyFocus | null;
  doctorTypeLabel?: string;
  specialtyFocusLabel?: string | null;
  designation?: string | null;
};

export type DoctorCapabilities = {
  slots: boolean;
  earnings: boolean;
  prescribe: boolean;
  caseAnalysis: boolean;
};

export const DOCTOR_TYPE_CAPABILITIES: Record<HomeopathicDoctorType, DoctorCapabilities> = {
  CHIEF_CONSULTANT: { slots: true, earnings: true, prescribe: true, caseAnalysis: true },
  JUNIOR_DOCTOR: { slots: true, earnings: true, prescribe: true, caseAnalysis: true },
  SPECIALIST_CONSULTANT: { slots: true, earnings: true, prescribe: true, caseAnalysis: true },
  VISITING_DOCTOR: { slots: false, earnings: false, prescribe: true, caseAnalysis: true },
  TELEMEDICINE_DOCTOR: { slots: true, earnings: true, prescribe: true, caseAnalysis: true },
  MEDICAL_INTERN: { slots: false, earnings: false, prescribe: false, caseAnalysis: true },
  RESIDENT_MEDICAL_OFFICER: { slots: true, earnings: true, prescribe: true, caseAnalysis: true }
};

export function capabilitiesForDoctorType(type?: HomeopathicDoctorType | null): DoctorCapabilities {
  return DOCTOR_TYPE_CAPABILITIES[type || 'JUNIOR_DOCTOR'];
}

export function navItemsForDoctorType(type?: HomeopathicDoctorType | null) {
  const capabilities = capabilitiesForDoctorType(type);
  const items = [
    { path: `/${ROUTE_PATHS.WORKLIST}`, label: 'Worklist', enabled: true },
    { path: `/${ROUTE_PATHS.DASHBOARD}`, label: 'Dashboard', enabled: true },
    { path: `/${ROUTE_PATHS.APPOINTMENTS}`, label: 'Appointments', enabled: capabilities.prescribe },
    { path: `/${ROUTE_PATHS.PATIENTS}`, label: 'Patients', enabled: true },
    { path: `/${ROUTE_PATHS.SLOTS}`, label: 'Slots', enabled: capabilities.slots },
    { path: `/${ROUTE_PATHS.EARNINGS}`, label: 'Earnings', enabled: capabilities.earnings },
    { path: `/${ROUTE_PATHS.LEAVES}`, label: 'Leaves', enabled: true },
    { path: `/${ROUTE_PATHS.PROFILE}`, label: 'Profile', enabled: true }
  ];
  return items.filter((item) => item.enabled);
}
