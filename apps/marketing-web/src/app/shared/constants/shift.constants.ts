import type { WorkShift } from '../../models';

export const WEEK_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
] as const;

export const WORK_SHIFT_OPTIONS: { value: WorkShift; label: string }[] = [
  { value: 'MORNING', label: 'Morning' },
  { value: 'AFTERNOON', label: 'Afternoon' },
  { value: 'EVENING', label: 'Evening' },
  { value: 'NIGHT', label: 'Night' },
  { value: 'FULL_DAY', label: 'Full Day' },
  { value: 'CUSTOM', label: 'Custom' }
];
