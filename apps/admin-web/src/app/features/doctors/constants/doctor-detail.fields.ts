import type { DetailFieldDef } from '@hopehub/platform-ui';
import {
  DOCTOR_TYPE_LABELS,
  PROVIDER_TYPE_LABELS,
  SPECIALTY_FOCUS_LABELS,
  type HomeopathicDoctorType,
  type HomeopathicSpecialtyFocus,
  type ProviderType,
} from './doctor-types.constants';

export type DoctorDetailSource = {
  email?: string;
  mobile?: string;
  isActive: boolean;
  doctorProfile?: {
    providerType?: ProviderType;
    specialty?: string;
    specialization?: string | null;
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
    label: 'Provider type',
    getValue: (d) =>
      d.doctorProfile?.providerType
        ? PROVIDER_TYPE_LABELS[d.doctorProfile.providerType]
        : 'Provider',
  },
  {
    label: 'Homeopathy role',
    getValue: (d) =>
      d.doctorProfile?.providerType === 'HOMEOPATH' && d.doctorProfile?.doctorType
        ? DOCTOR_TYPE_LABELS[d.doctorProfile.doctorType]
        : '',
    omitWhenEmpty: true,
  },
  {
    label: 'Specialty focus',
    getValue: (d) =>
      d.doctorProfile?.specialtyFocus ? SPECIALTY_FOCUS_LABELS[d.doctorProfile.specialtyFocus] : '',
    omitWhenEmpty: true,
  },
  {
    label: 'Specialization',
    getValue: (d) => d.doctorProfile?.specialization,
    omitWhenEmpty: true,
  },
  { label: 'Specialty', getValue: (d) => d.doctorProfile?.specialty, emptyText: 'N/A' },
  { label: 'Registration No', getValue: (d) => d.doctorProfile?.registrationNo, emptyText: 'N/A' },
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
