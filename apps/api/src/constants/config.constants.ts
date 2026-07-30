const parseOriginList = (...values: Array<string | undefined>) =>
  values
    .flatMap((value) => (value || '').split(','))
    .map((origin) => origin.trim())
    .filter(Boolean);

const configuredOrigins = parseOriginList(
  process.env.WEB_ORIGIN,
  process.env.ADMIN_ORIGIN,
  process.env.DOCTOR_ORIGIN,
  process.env.OPERATIONS_ORIGIN,
  process.env.CORS_ORIGINS
);

const defaultCorsOrigins = [
  'https://hopehub.in',
  'https://www.hopehub.in',
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  'http://localhost:4201',
  'http://127.0.0.1:4201',
  'http://localhost:4202',
  'http://127.0.0.1:4202',
  'http://localhost:4203',
  'http://127.0.0.1:4203',
  'http://localhost:4204',
  'http://127.0.0.1:4204',
  'http://localhost:5800',
  'http://127.0.0.1:5800'
];

export const SERVER_CONFIG = {
  DEFAULT_PORT: 4000,
  ORIGINS: {
    WEB: process.env.WEB_ORIGIN || 'http://localhost:4203',
    ADMIN: process.env.ADMIN_ORIGIN || 'http://localhost:4201',
    DOCTOR: process.env.DOCTOR_ORIGIN || 'http://localhost:4202',
    OPERATIONS: process.env.OPERATIONS_ORIGIN || 'http://localhost:5800'
  },
  CORS_ORIGINS:
    configuredOrigins.length > 0
      ? Array.from(new Set([...configuredOrigins, ...defaultCorsOrigins]))
      : defaultCorsOrigins,
  API_PUBLIC_URL: process.env.API_PUBLIC_URL || process.env.API_URL || 'http://localhost:4000',
  SMTP: {
    DEFAULT_PORT: 587,
    DEFAULT_FROM: 'noreply@hopehub.in'
  },
  DEV_OTP: process.env.DEV_OTP || '123456'
} as const;

export const SCHEDULER_CONFIG = {
  LEAVE_RESTORE_MS: 60 * 60 * 1000,
  DOSE_OVERDUE_SWEEP_MIN_MS: 60 * 1000,
  DOSE_OVERDUE_SWEEP_DEFAULT_MS: 5 * 60 * 1000,
  DOSE_REMINDER_WINDOW_MIN_MINUTES: 5,
  DOSE_REMINDER_WINDOW_DEFAULT_MINUTES: 30,
  BATCH_TAKE_LIMIT: 200
} as const;
