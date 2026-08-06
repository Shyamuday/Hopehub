import { IMAGE_ASSETS } from './image-assets.constants';

export const BRAND_ASSETS = {
  LOGO_PATH: IMAGE_ASSETS.BRAND.LOGO,
  APP_ICON_PATH: IMAGE_ASSETS.BRAND.APP_ICON,
  OG_IMAGE_PATH: IMAGE_ASSETS.BRAND.OG_IMAGE,
} as const;

export const APP_CONSTANTS = {
  SITE_URL: 'https://hopehub.in',
  SITE_NAME: 'Hope Hub',
  BRAND: BRAND_ASSETS,
  TELEGRAM: {
    USERNAME: '',
    GROUP_URL: '',
    SUPPORT_HANDLE: '',
    QR_CODE: '',
    BOTS: [
      {
        key: 'user-support',
        title: 'User Support Bot',
        handle: '',
        url: '',
        audience: 'Users',
        purpose:
          'Start here for user help, daily plan, tasks, session requests, and emotional support listener help.',
      },
      {
        key: 'doctor-provider',
        title: 'Care Team Bot',
        handle: '',
        url: '',
        audience: 'Doctors, counsellors, and emotional support listeners',
        purpose:
          'For care team members to link their account, manage queue, and update availability.',
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
        handle: '',
        url: '',
        audience: 'Community members',
        purpose:
          'Anonymous-friendly community updates, support discussions, and daily voice circle.',
      },
    ],
  },
  WHATSAPP: {
    GROUP_URL: '',
    QR_CODE: '',
  },
  PUBLIC_ASSETS: IMAGE_ASSETS,
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
