import { FILTER_ALL, SORT_DIRECTIONS } from '../../../shared/constants/filter.constants';
import { PAGE_SIZES } from '../../../core/constants/pagination.constants';

export const DOCTORS_PAGE_SIZE = PAGE_SIZES.DOCTORS;

export const DOCTOR_STATUS_FILTERS = [FILTER_ALL, 'ACTIVE', 'INACTIVE', 'SUSPENDED'] as const;
export type DoctorStatusFilter = (typeof DOCTOR_STATUS_FILTERS)[number];

export const DOCTOR_SORT_FIELDS = ['name', 'createdAt', 'status'] as const;
export type DoctorSortField = (typeof DOCTOR_SORT_FIELDS)[number];

export const DOCTORS_LIST_DEFAULTS = {
  SORT_BY: 'createdAt' as DoctorSortField,
  SORT_DIRECTION: SORT_DIRECTIONS.DESC,
  STATUS_FILTER: FILTER_ALL as DoctorStatusFilter,
} as const;
