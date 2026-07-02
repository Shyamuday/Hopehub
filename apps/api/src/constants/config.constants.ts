export const SERVER_CONFIG = {
  DEFAULT_PORT: 4000,
  ORIGINS: {
    WEB: process.env.WEB_ORIGIN || 'http://localhost:4200',
    ADMIN: process.env.ADMIN_ORIGIN || 'http://localhost:4201',
    DOCTOR: process.env.DOCTOR_ORIGIN || 'http://localhost:4202',
    STORE: process.env.STORE_ORIGIN || 'http://localhost:4300',
    HR: process.env.HR_ORIGIN || 'http://localhost:4400'
  },
  SMTP: {
    DEFAULT_PORT: 587,
    DEFAULT_FROM: 'noreply@vitaliscare.in'
  },
  DEV_OTP: process.env.DEV_OTP || '123456'
} as const;

export const SCHEDULER_CONFIG = {
  DOSE_OVERDUE_SWEEP_MIN_MS: 60_000,
  DOSE_OVERDUE_SWEEP_DEFAULT_MS: 5 * 60_000,
  DOSE_REMINDER_WINDOW_MIN_MINUTES: 5,
  DOSE_REMINDER_WINDOW_DEFAULT_MINUTES: 30,
  LEAVE_RESTORE_MS: 24 * 60 * 60 * 1000,
  BATCH_TAKE_LIMIT: 1000
} as const;

export const CURRENCY_CODE = 'INR';
