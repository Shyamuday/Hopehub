import type { DetailFieldDef } from '@hopehub/platform-ui';
import {
  DOCTOR_TYPE_LABELS,
  SPECIALTY_FOCUS_LABELS,
  type HomeopathicDoctorType,
  type HomeopathicSpecialtyFocus,
} from './doctor-types.constants';

export type DoctorDetailSource = {
  email?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY' | null;
  mobile?: string;
  isActive: boolean;
  doctorProfile?: {
    specialty?: string;
    registrationNo?: string;
    isAvailable?: boolean;
    doctorType?: HomeopathicDoctorType;
    specialtyFocus?: HomeopathicSpecialtyFocus | null;
    designation?: string | null;
    department?: string | null;
    bio?: string | null;
    showOnWebsite?: boolean;
    websiteOrder?: number | null;
    focusAreas?: string[];
    mentalHealthProfile?: {
      languages?: string[];
    } | null;
  };
};

export const DOCTOR_DETAIL_FIELDS: DetailFieldDef<DoctorDetailSource>[] = [
  { label: 'Email', getValue: (d) => d.email, emptyText: 'N/A' },
  {
    label: 'Gender',
    getValue: (d) => {
      const labels: Record<string, string> = {
        FEMALE: 'Female',
        MALE: 'Male',
        OTHER: 'Other',
        PREFER_NOT_TO_SAY: 'Prefer not to say',
      };
      return d.gender ? labels[d.gender] || d.gender : '';
    },
    omitWhenEmpty: true,
  },
  { label: 'Mobile', getValue: (d) => d.mobile, emptyText: 'N/A' },
  {
    label: 'Doctor type',
    getValue: (d) =>
      d.doctorProfile?.doctorType ? DOCTOR_TYPE_LABELS[d.doctorProfile.doctorType] : 'Not set',
  },
  {
    label: 'Specialty focus',
    getValue: (d) =>
      d.doctorProfile?.specialtyFocus ? SPECIALTY_FOCUS_LABELS[d.doctorProfile.specialtyFocus] : '',
    omitWhenEmpty: true,
  },
  { label: 'Specialty', getValue: (d) => d.doctorProfile?.specialty, emptyText: 'N/A' },
  {
    label: 'Designation',
    getValue: (d) => d.doctorProfile?.designation ?? '',
    omitWhenEmpty: true,
  },
  {
    label: 'Department',
    getValue: (d) => d.doctorProfile?.department ?? '',
    omitWhenEmpty: true,
  },
  { label: 'Registration No', getValue: (d) => d.doctorProfile?.registrationNo, emptyText: 'N/A' },
  {
    label: 'Languages',
    getValue: (d) => (d.doctorProfile?.mentalHealthProfile?.languages ?? []).join(', '),
    omitWhenEmpty: true,
  },
  {
    label: 'Status',
    getValue: (d) => (d.isActive ? 'Active' : 'Inactive'),
  },
  {
    label: 'Available',
    getValue: (d) => (d.doctorProfile?.isAvailable ? 'Yes' : 'No'),
  },
  {
    label: 'On website',
    getValue: (d) => {
      if (!d.doctorProfile?.showOnWebsite) {
        return 'No';
      }
      const order = d.doctorProfile.websiteOrder;
      return order ? `Yes — Position #${order}` : 'Yes';
    },
  },
  {
    label: 'Bio',
    getValue: (d) => d.doctorProfile?.bio ?? '',
    omitWhenEmpty: true,
  },
  {
    label: 'Focus areas',
    getValue: (d) => (d.doctorProfile?.focusAreas ?? []).join(', '),
    omitWhenEmpty: true,
  },
];
