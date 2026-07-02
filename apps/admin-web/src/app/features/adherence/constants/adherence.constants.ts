export const ADHERENCE_WINDOW_OPTIONS = [
  { value: 7, label: 'Last 7 days' },
  { value: 14, label: 'Last 14 days' },
  { value: 30, label: 'Last 30 days' }
] as const;

export const ADHERENCE_MIN_DOSE_OPTIONS = [
  { value: 3, label: 'Min 3 doses' },
  { value: 5, label: 'Min 5 doses' },
  { value: 8, label: 'Min 8 doses' }
] as const;

export const RISK_TIER_LABELS = {
  HIGH_RISK: 'High risk',
  MEDIUM_RISK: 'Medium risk',
  ON_TRACK: 'On track'
} as const;

export const ALERT_SEVERITY_STYLES = {
  HIGH: { bg: '#fee2e2', color: '#991b1b' },
  MEDIUM: { bg: '#fef3c7', color: '#92400e' }
} as const;
