export const SERVER_CONFIG = {
  DEFAULT_PORT: 4000,
  ORIGINS: {
    WEB: process.env.WEB_ORIGIN || 'http://localhost:4200',
    ADMIN: process.env.ADMIN_ORIGIN || 'http://localhost:4201',
    DOCTOR: process.env.DOCTOR_ORIGIN || 'http://localhost:4202',
    OPERATIONS: process.env.OPERATIONS_ORIGIN || 'http://localhost:5800'
  },
  API_PUBLIC_URL: process.env.API_PUBLIC_URL || process.env.API_URL || 'http://localhost:4000',
  SMTP: {
    DEFAULT_PORT: 587,
    DEFAULT_FROM: 'noreply@vitaliscare.in'
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
