import { HomeopathicDoctorType, HomeopathicSpecialtyFocus } from '@prisma/client';
import {
  HOMEOPATHIC_SPECIALTY_FOCUS_LABELS,
  doctorTypeLabel,
  resolveDoctorSpecialty,
  specialtyFocusLabel
} from './homeopathic-doctor-types.js';

export type DoctorHrDefaults = {
  designation: string;
  department: string;
  specialty: string;
  employmentType: string;
  letterSubject: string;
  showSalary: boolean;
  showConsultationFee: boolean;
  defaultProbationMonths: number | null;
};

export function defaultDepartment(
  doctorType: HomeopathicDoctorType,
  specialtyFocus?: HomeopathicSpecialtyFocus | null
) {
  if (doctorType === HomeopathicDoctorType.SPECIALIST_CONSULTANT && specialtyFocus) {
    return `${HOMEOPATHIC_SPECIALTY_FOCUS_LABELS[specialtyFocus]} Homeopathy`;
  }
  switch (doctorType) {
    case HomeopathicDoctorType.TELEMEDICINE_DOCTOR:
      return 'Telemedicine';
    case HomeopathicDoctorType.MEDICAL_INTERN:
      return 'Medical Training';
    case HomeopathicDoctorType.VISITING_DOCTOR:
      return 'Visiting Consultant';
    case HomeopathicDoctorType.RESIDENT_MEDICAL_OFFICER:
      return 'Clinical Operations';
    default:
      return 'Homeopathy';
  }
}

export function doctorHrDefaults(
  doctorType: HomeopathicDoctorType,
  specialtyFocus?: HomeopathicSpecialtyFocus | null
): DoctorHrDefaults {
  const designation = doctorTypeLabel(doctorType);
  const department = defaultDepartment(doctorType, specialtyFocus);
  const specialty = resolveDoctorSpecialty({ doctorType, specialtyFocus });

  switch (doctorType) {
    case HomeopathicDoctorType.CHIEF_CONSULTANT:
      return {
        designation,
        department,
        specialty,
        employmentType: 'Full-time — Chief Consultant',
        letterSubject: 'Appointment as Chief Homeopathic Consultant',
        showSalary: true,
        showConsultationFee: true,
        defaultProbationMonths: null
      };
    case HomeopathicDoctorType.JUNIOR_DOCTOR:
      return {
        designation,
        department,
        specialty,
        employmentType: 'Full-time — Junior Doctor',
        letterSubject: 'Appointment as Junior Homeopathic Doctor',
        showSalary: true,
        showConsultationFee: true,
        defaultProbationMonths: 6
      };
    case HomeopathicDoctorType.SPECIALIST_CONSULTANT:
      return {
        designation,
        department,
        specialty,
        employmentType: 'Full-time — Specialist Consultant',
        letterSubject: `Appointment as Specialist Homeopathic Consultant (${specialty})`,
        showSalary: true,
        showConsultationFee: true,
        defaultProbationMonths: 3
      };
    case HomeopathicDoctorType.VISITING_DOCTOR:
      return {
        designation,
        department,
        specialty,
        employmentType: 'Visiting / Session-based',
        letterSubject: 'Engagement as Visiting Homeopathic Doctor',
        showSalary: false,
        showConsultationFee: true,
        defaultProbationMonths: null
      };
    case HomeopathicDoctorType.TELEMEDICINE_DOCTOR:
      return {
        designation,
        department,
        specialty,
        employmentType: 'Telemedicine Consultant',
        letterSubject: 'Appointment as Telemedicine Homeopathic Doctor',
        showSalary: true,
        showConsultationFee: true,
        defaultProbationMonths: 3
      };
    case HomeopathicDoctorType.MEDICAL_INTERN:
      return {
        designation,
        department,
        specialty,
        employmentType: 'Internship / Training',
        letterSubject: 'Internship Appointment — Medical Intern',
        showSalary: true,
        showConsultationFee: false,
        defaultProbationMonths: 12
      };
    case HomeopathicDoctorType.RESIDENT_MEDICAL_OFFICER:
      return {
        designation,
        department,
        specialty,
        employmentType: 'Full-time — Resident Medical Officer',
        letterSubject: 'Appointment as Resident Medical Officer (RMO)',
        showSalary: true,
        showConsultationFee: true,
        defaultProbationMonths: 6
      };
    default:
      return {
        designation,
        department,
        specialty,
        employmentType: 'Full-time',
        letterSubject: 'Appointment Letter',
        showSalary: true,
        showConsultationFee: true,
        defaultProbationMonths: 6
      };
  }
}

export function applyDoctorHrProfileFields(input: {
  doctorType: HomeopathicDoctorType;
  specialtyFocus?: HomeopathicSpecialtyFocus | null;
  specialty?: string | null;
  designation?: string | null;
  department?: string | null;
}) {
  const defaults = doctorHrDefaults(input.doctorType, input.specialtyFocus);
  return {
    doctorType: input.doctorType,
    specialtyFocus:
      input.doctorType === HomeopathicDoctorType.SPECIALIST_CONSULTANT ? input.specialtyFocus ?? null : null,
    specialty: resolveDoctorSpecialty({
      doctorType: input.doctorType,
      specialtyFocus: input.specialtyFocus,
      specialty: input.specialty ?? defaults.specialty
    }),
    designation: input.designation?.trim() || defaults.designation,
    department: input.department?.trim() || defaults.department
  };
}

function letterTerms(doctorType: HomeopathicDoctorType): string[] {
  const common = [
    'You shall maintain professional ethics, patient confidentiality, and comply with clinic SOPs.',
    'Clinical documentation, case records, and prescriptions must be entered in the HopeHub system.'
  ];

  switch (doctorType) {
    case HomeopathicDoctorType.CHIEF_CONSULTANT:
      return [
        'You will lead clinical standards, mentor junior doctors, and support complex case management.',
        ...common
      ];
    case HomeopathicDoctorType.JUNIOR_DOCTOR:
      return [
        'You will consult under clinic protocols and seek senior guidance for complex cases as needed.',
        ...common
      ];
    case HomeopathicDoctorType.SPECIALIST_CONSULTANT:
      return [
        'You will provide specialist homeopathic consultations within your declared focus area.',
        'Cross-referrals to chief consultant or other specialists should be documented when required.',
        ...common
      ];
    case HomeopathicDoctorType.VISITING_DOCTOR:
      return [
        'This engagement is on a visiting/session basis for agreed clinic days only.',
        'Remuneration is as per visit schedule or revenue share agreed separately — not a fixed payroll unless specified.',
        ...common
      ];
    case HomeopathicDoctorType.TELEMEDICINE_DOCTOR:
      return [
        'You will conduct consultations remotely through approved telemedicine channels with informed patient consent.',
        'Follow-up and emergency escalation protocols for teleconsultations must be followed.',
        ...common
      ];
    case HomeopathicDoctorType.MEDICAL_INTERN:
      return [
        'This is a supervised training role. Prescriptions and independent clinical decisions require approving consultant sign-off.',
        'Internship completion is subject to performance review and training hour requirements.',
        ...common
      ];
    case HomeopathicDoctorType.RESIDENT_MEDICAL_OFFICER:
      return [
        'You will support round-the-clock clinical operations, admissions, and coordination with consulting doctors.',
        'Shift handover notes must be completed at the end of each duty period.',
        ...common
      ];
    default:
      return common;
  }
}

export type DoctorJoiningLetterInput = {
  letterNumber: string;
  issuedDate: Date;
  organizationName: string;
  organizationAddress: string;
  employeeName: string;
  employeeEmail: string;
  employeeCode: string;
  doctorType: HomeopathicDoctorType;
  specialtyFocus?: HomeopathicSpecialtyFocus | null;
  designation: string;
  department: string;
  specialty: string;
  registrationNo: string;
  joiningDate: Date;
  probationEndDate?: Date | null;
  salaryLabel: string;
  consultationFeeLabel: string;
  shiftLabel: string;
  weeklyOff: string;
  phone: string;
  address: string;
};

export function buildDoctorJoiningLetterContent(input: DoctorJoiningLetterInput) {
  const defaults = doctorHrDefaults(input.doctorType, input.specialtyFocus);
  const terms = letterTerms(input.doctorType);

  return {
    letterNumber: input.letterNumber,
    issuedDate: input.issuedDate.toISOString(),
    organizationName: input.organizationName,
    organizationAddress: input.organizationAddress,
    employeeName: input.employeeName,
    employeeEmail: input.employeeEmail,
    employeeCode: input.employeeCode,
    doctorType: doctorTypeLabel(input.doctorType),
    doctorTypeCode: input.doctorType,
    specialtyFocus: specialtyFocusLabel(input.specialtyFocus),
    employmentType: defaults.employmentType,
    letterSubject: defaults.letterSubject,
    designation: input.designation,
    department: input.department,
    specialty: input.specialty,
    registrationNo: input.registrationNo,
    joiningDate: input.joiningDate.toISOString(),
    probationEndDate: input.probationEndDate?.toISOString() ?? null,
    salary: defaults.showSalary ? input.salaryLabel : 'Not applicable (visiting engagement)',
    consultationFee: defaults.showConsultationFee ? input.consultationFeeLabel : 'Not applicable',
    shift: input.shiftLabel,
    weeklyOff: input.weeklyOff,
    phone: input.phone,
    address: input.address,
    terms,
    showSalary: defaults.showSalary,
    showConsultationFee: defaults.showConsultationFee,
    requiresSupervision: input.doctorType === HomeopathicDoctorType.MEDICAL_INTERN
  };
}

export function suggestedProbationEndDate(
  joiningDate: Date,
  doctorType: HomeopathicDoctorType
): Date | null {
  const months = doctorHrDefaults(doctorType).defaultProbationMonths;
  if (!months) return null;
  const end = new Date(joiningDate);
  end.setMonth(end.getMonth() + months);
  return end;
}
