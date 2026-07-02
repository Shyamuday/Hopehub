export const SLOT_TEMPLATES = [
  { label: '9 AM - 1 PM (30 min slots)', start: '09:00', end: '13:00', step: 30 },
  { label: '2 PM - 6 PM (30 min slots)', start: '14:00', end: '18:00', step: 30 },
  { label: '9 AM - 5 PM (1 hr slots)', start: '09:00', end: '17:00', step: 60 },
  { label: '6 PM - 9 PM (30 min slots)', start: '18:00', end: '21:00', step: 30 }
] as const;

export const WEEKDAY_SHORT_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
