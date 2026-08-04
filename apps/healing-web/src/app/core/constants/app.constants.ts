// Update this value when the public Telegram username changes. URLs and labels derive from it.
export const TELEGRAM_USERNAME = 'hopehubindia';
export const TELEGRAM_USER_BOT_USERNAME = 'Hopehubbot';
export const TELEGRAM_DOCTOR_BOT_USERNAME = 'Hopehubprovidersbot';
export const TELEGRAM_ADMIN_BOT_USERNAME = 'Hopehuboperationbot';

export const APP_CONSTANTS = {
  SITE_URL: 'https://hopehub.in',
  SITE_NAME: 'Hope Hub',
  TELEGRAM: {
    USERNAME: TELEGRAM_USERNAME,
    GROUP_URL: `https://t.me/${TELEGRAM_USERNAME}`,
    SUPPORT_HANDLE: `@${TELEGRAM_USERNAME}`,
    QR_CODE: '/image/hopehubindiaqr.jpg',
    BOTS: [
      {
        key: 'user-support',
        title: 'User Support Bot',
        handle: `@${TELEGRAM_USER_BOT_USERNAME}`,
        url: `https://t.me/${TELEGRAM_USER_BOT_USERNAME}`,
        audience: 'Users',
        purpose:
          'Start here for user help, daily plan, tasks, session requests, and volunteer support.',
      },
      {
        key: 'doctor-provider',
        title: 'Doctor / Provider Bot',
        handle: `@${TELEGRAM_DOCTOR_BOT_USERNAME}`,
        url: `https://t.me/${TELEGRAM_DOCTOR_BOT_USERNAME}`,
        audience: 'Doctors and psychologists',
        purpose: 'For providers to link their account, manage queue, and update availability.',
      },
      // Internal admin bot. Keep this private; do not show on public Telegram hub.
      // {
      //   key: 'operations-admin',
      //   title: 'Operations / Admin Bot',
      //   handle: `@${TELEGRAM_ADMIN_BOT_USERNAME}`,
      //   url: `https://t.me/${TELEGRAM_ADMIN_BOT_USERNAME}`,
      //   audience: 'Hope Hub team',
      //   purpose: 'For admins and operations team to monitor leads, contributors, and daily workload.',
      // },
    ],
    GROUPS: [
      {
        key: 'community',
        title: 'Hope Hub India Community',
        handle: `@${TELEGRAM_USERNAME}`,
        url: `https://t.me/${TELEGRAM_USERNAME}`,
        audience: 'Community members',
        purpose:
          'Anonymous-friendly community updates, support discussions, and daily voice circle.',
      },
    ],
  },
  WHATSAPP: {
    GROUP_URL: 'https://chat.whatsapp.com/CbbNoo5kXw3FWWKTGO82kz',
    QR_CODE: '/image/whatsapp-qr.jpeg',
  },
  CONTACT: {
    EMAIL: 'contact@hopehub.in',
    PHONE: 'Use the request form for routing',
    CRISIS_HOTLINE: '14416',
  },
  MEETUP: {
    SCHEDULE: 'First Sunday of every month',
    TIME: '2:00 PM - 4:00 PM IST',
    MAX_ATTENDEES: 25,
  },
} as const;
