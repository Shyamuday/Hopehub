import type { DetailFieldDef } from '@hopehub/platform-ui';
import {
  DOCTOR_TYPE_LABELS,
  SPECIALTY_FOCUS_LABELS,
  type HomeopathicDoctorType,
  type HomeopathicSpecialtyFocus
} from './doctor-types.constants';

export type DoctorDetailSource = {
  email?: string;
  mobile?: string;
  isActive: boolean;
  doctorProfile?: {
    specialty?: string;
    registrationNo?: string;
    isAvailable?: boolean;
    doctorType?: HomeopathicDoctorType;
    specialtyFocus?: HomeopathicSpecialtyFocus | null;
    bio?: string | null;
    showOnWebsite?: boolean;
    websiteOrder?: number | null;
    focusAreas?: string[];
  };
};

export const DOCTOR_DETAIL_FIELDS: DetailFieldDef<DoctorDetailSource>[] = [
  { label: 'Email', getValue: (d) => d.email, emptyText: 'N/A' },
  { label: 'Mobile', getValue: (d) => d.mobile, emptyText: 'N/A' },
  {
    label: 'Doctor type',
    getValue: (d) =>
      d.doctorProfile?.doctorType ? DOCTOR_TYPE_LABELS[d.doctorProfile.doctorType] : 'Not set'
  },
  {
    label: 'Specialty focus',
    getValue: (d) =>
      d.doctorProfile?.specialtyFocus ? SPECIALTY_FOCUS_LABELS[d.doctorProfile.specialtyFocus] : '',
    omitWhenEmpty: true
  },
  { label: 'Specialty', getValue: (d) => d.doctorProfile?.specialty, emptyText: 'N/A' },
  { label: 'Registration No', getValue: (d) => d.doctorProfile?.registrationNo, emptyText: 'N/A' },
  {
    label: 'Status',
    getValue: (d) => (d.isActive ? 'Active' : 'Inactive')
  },
  {
    label: 'Available',
    getValue: (d) => (d.doctorProfile?.isAvailable ? 'Yes' : 'No')
  },
  {
    label: 'On website',
    getValue: (d) => {
      if (!d.doctorProfile?.showOnWebsite) {
        return 'No';
      }
      const order = d.doctorProfile.websiteOrder;
      return order ? `Yes — Position #${order}` : 'Yes';
    }
  },
  {
    label: 'Bio',
    getValue: (d) => d.doctorProfile?.bio ?? '',
    omitWhenEmpty: true
  },
  {
    label: 'Focus areas',
    getValue: (d) => (d.doctorProfile?.focusAreas ?? []).join(', '),
    omitWhenEmpty: true
  }
];
