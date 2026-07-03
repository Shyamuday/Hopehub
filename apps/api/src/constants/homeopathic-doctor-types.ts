import { HomeopathicDoctorType, HomeopathicSpecialtyFocus } from '@prisma/client';
import { z } from 'zod';

export const HOMEOPATHIC_DOCTOR_TYPE_LABELS: Record<HomeopathicDoctorType, string> = {
  CHIEF_CONSULTANT: 'Homeopathic Doctor (Chief Consultant)',
  JUNIOR_DOCTOR: 'Junior Homeopathic Doctor',
  SPECIALIST_CONSULTANT: 'Specialist Homeopathic Consultant',
  VISITING_DOCTOR: 'Visiting Doctor',
  TELEMEDICINE_DOCTOR: 'Telemedicine Doctor',
  MEDICAL_INTERN: 'Medical Intern',
  RESIDENT_MEDICAL_OFFICER: 'Resident Medical Officer (RMO)'
};

export const HOMEOPATHIC_SPECIALTY_FOCUS_LABELS: Record<HomeopathicSpecialtyFocus, string> = {
  SKIN: "Skin",
  CHILD: "Child",
  WOMENS_HEALTH: "Women's Health",
  CHRONIC_DISEASES: 'Chronic Diseases'
};

export const homeopathicDoctorTypeSchema = z.nativeEnum(HomeopathicDoctorType);
export const homeopathicSpecialtyFocusSchema = z.nativeEnum(HomeopathicSpecialtyFocus);

export type DoctorTypeCapabilities = {
  slots: boolean;
  earnings: boolean;
  prescribe: boolean;
  caseAnalysis: boolean;
};

export const DOCTOR_TYPE_CAPABILITIES: Record<HomeopathicDoctorType, DoctorTypeCapabilities> = {
  CHIEF_CONSULTANT: { slots: true, earnings: true, prescribe: true, caseAnalysis: true },
  JUNIOR_DOCTOR: { slots: true, earnings: true, prescribe: true, caseAnalysis: true },
  SPECIALIST_CONSULTANT: { slots: true, earnings: true, prescribe: true, caseAnalysis: true },
  VISITING_DOCTOR: { slots: false, earnings: false, prescribe: true, caseAnalysis: true },
  TELEMEDICINE_DOCTOR: { slots: true, earnings: true, prescribe: true, caseAnalysis: true },
  MEDICAL_INTERN: { slots: false, earnings: false, prescribe: false, caseAnalysis: true },
  RESIDENT_MEDICAL_OFFICER: { slots: true, earnings: true, prescribe: true, caseAnalysis: true }
};

export const doctorProfileSelect = {
  specialty: true,
  registrationNo: true,
  isAvailable: true,
  doctorType: true,
  specialtyFocus: true,
  designation: true
} as const;

export function specialtyFocusLabel(focus: HomeopathicSpecialtyFocus | null | undefined) {
  return focus ? HOMEOPATHIC_SPECIALTY_FOCUS_LABELS[focus] : null;
}

export function doctorTypeLabel(type: HomeopathicDoctorType | null | undefined) {
  return type ? HOMEOPATHIC_DOCTOR_TYPE_LABELS[type] : HOMEOPATHIC_DOCTOR_TYPE_LABELS.JUNIOR_DOCTOR;
}

export function resolveDoctorSpecialty(input: {
  doctorType: HomeopathicDoctorType;
  specialtyFocus?: HomeopathicSpecialtyFocus | null;
  specialty?: string | null;
}) {
  if (input.doctorType === HomeopathicDoctorType.SPECIALIST_CONSULTANT && input.specialtyFocus) {
    return `${HOMEOPATHIC_SPECIALTY_FOCUS_LABELS[input.specialtyFocus]} Specialist`;
  }
  return input.specialty?.trim() || 'Homeopathy';
}

export function doctorProfileSchema() {
  return z
    .object({
      doctorType: homeopathicDoctorTypeSchema.optional(),
      specialtyFocus: homeopathicSpecialtyFocusSchema.nullable().optional(),
      specialty: z.string().min(2).optional().or(z.literal('')),
      registrationNo: z.string().optional().or(z.literal('')),
      isAvailable: z.boolean().optional()
    })
    .superRefine((body, ctx) => {
      const doctorType = body.doctorType ?? HomeopathicDoctorType.JUNIOR_DOCTOR;
      if (doctorType === HomeopathicDoctorType.SPECIALIST_CONSULTANT && !body.specialtyFocus) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Specialty focus is required for specialist consultants.',
          path: ['specialtyFocus']
        });
      }
      if (doctorType !== HomeopathicDoctorType.SPECIALIST_CONSULTANT && body.specialtyFocus) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Specialty focus applies only to specialist consultants.',
          path: ['specialtyFocus']
        });
      }
    });
}

export function toDoctorProfilePayload(body: z.infer<ReturnType<typeof doctorProfileSchema>>) {
  const doctorType = body.doctorType ?? HomeopathicDoctorType.JUNIOR_DOCTOR;
  const specialtyFocus =
    doctorType === HomeopathicDoctorType.SPECIALIST_CONSULTANT ? body.specialtyFocus ?? null : null;

  return {
    doctorType,
    specialtyFocus,
    specialty: resolveDoctorSpecialty({
      doctorType,
      specialtyFocus,
      specialty: body.specialty
    }),
    registrationNo: body.registrationNo || null,
    isAvailable: body.isAvailable ?? true
  };
}
