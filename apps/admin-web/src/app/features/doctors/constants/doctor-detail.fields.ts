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
    providerDomain?: 'HOMEOPATHY' | 'HOPE_HUB' | null;
    providerClassification?: {
      domain: 'HOMEOPATHY' | 'HOPE_HUB';
      primaryRole: string | null;
      roles: string[];
    };
    roleAssignments?: Array<{
      roleCode: string;
      isPrimary: boolean;
      status: string;
      credentialStatus: string;
      role?: { label?: string; shortLabel?: string };
    }>;
    specialtyFocus?: HomeopathicSpecialtyFocus | null;
    designation?: string | null;
    department?: string | null;
    bio?: string | null;
    showOnWebsite?: boolean;
    websiteOrder?: number | null;
    suspendedAt?: string | null;
    suspendedReason?: string | null;
    focusAreas?: string[];
    mentalHealthProfile?: {
      languages?: string[];
      autoMatchEnabled?: boolean;
      acceptingNewUsers?: boolean;
      maxSessionsPerDay?: number | null;
      maxSessionsPerWeek?: number | null;
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
    label: 'Provider domain',
    getValue: (d) => {
      const domain =
        d.doctorProfile?.providerClassification?.domain || d.doctorProfile?.providerDomain;
      if (domain === 'HOPE_HUB') return 'Hope Hub';
      if (domain === 'HOMEOPATHY') return 'Homeopathy';
      return d.doctorProfile?.doctorType === 'PSYCHOLOGIST' ? 'Hope Hub' : 'Homeopathy';
    },
  },
  {
    label: 'Provider roles',
    getValue: (d) => {
      const assignments = (d.doctorProfile?.roleAssignments ?? []).filter(
        (assignment) => assignment.status === 'ACTIVE',
      );
      if (assignments.length) {
        return assignments
          .map((assignment) => {
            const label = assignment.role?.label || assignment.roleCode;
            return assignment.isPrimary ? `${label} (primary)` : label;
          })
          .join(', ');
      }
      return (d.doctorProfile?.providerClassification?.roles ?? []).join(', ');
    },
    omitWhenEmpty: true,
  },
  {
    label: 'Role verification',
    getValue: (d) =>
      (d.doctorProfile?.roleAssignments ?? [])
        .filter((assignment) => assignment.status === 'ACTIVE')
        .map((assignment) => {
          const label =
            assignment.role?.shortLabel || assignment.role?.label || assignment.roleCode;
          const status = assignment.credentialStatus.toLowerCase().replaceAll('_', ' ');
          return `${label}: ${status}`;
        })
        .join(', '),
    omitWhenEmpty: true,
  },
  {
    label: 'Homeopathy type',
    getValue: (d) => {
      const domain =
        d.doctorProfile?.providerClassification?.domain || d.doctorProfile?.providerDomain;
      if (domain === 'HOPE_HUB' || (!domain && d.doctorProfile?.doctorType === 'PSYCHOLOGIST')) {
        return '';
      }
      return d.doctorProfile?.doctorType ? DOCTOR_TYPE_LABELS[d.doctorProfile.doctorType] : '';
    },
    omitWhenEmpty: true,
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
  {
    label: 'License / Registration',
    getValue: (d) => d.doctorProfile?.registrationNo,
    emptyText: 'N/A',
  },
  {
    label: 'Languages',
    getValue: (d) => (d.doctorProfile?.mentalHealthProfile?.languages ?? []).join(', '),
    omitWhenEmpty: true,
  },
  {
    label: 'Suggested to users',
    getValue: (d) =>
      d.doctorProfile?.mentalHealthProfile
        ? d.doctorProfile.mentalHealthProfile.autoMatchEnabled === false
          ? 'Off'
          : 'On'
        : '',
    omitWhenEmpty: true,
  },
  {
    label: 'Accepting bookings',
    getValue: (d) =>
      d.doctorProfile?.mentalHealthProfile
        ? d.doctorProfile.mentalHealthProfile.acceptingNewUsers === false
          ? 'No'
          : 'Yes'
        : '',
    omitWhenEmpty: true,
  },
  {
    label: 'Booking cap',
    getValue: (d) => {
      const mental = d.doctorProfile?.mentalHealthProfile;
      if (!mental) return '';
      const daily = mental.maxSessionsPerDay ? `${mental.maxSessionsPerDay}/day` : '';
      const weekly = mental.maxSessionsPerWeek ? `${mental.maxSessionsPerWeek}/week` : '';
      return [daily, weekly].filter(Boolean).join(', ') || 'No cap';
    },
    omitWhenEmpty: true,
  },
  {
    label: 'Status',
    getValue: (d) =>
      d.doctorProfile?.suspendedAt
        ? `Suspended${d.doctorProfile.suspendedReason ? ` — ${d.doctorProfile.suspendedReason}` : ''}`
        : d.isActive
          ? 'Active'
          : 'Inactive',
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
