// Update this value when the public Telegram username changes. URLs and labels derive from it.
export const TELEGRAM_USERNAME = 'hopehubindia';

export const APP_CONSTANTS = {
  SITE_URL: 'https://hopehub.in',
  SITE_NAME: 'Hope Hub',
  TELEGRAM: {
    GROUP_URL: `https://t.me/${TELEGRAM_USERNAME}`,
    SUPPORT_HANDLE: `@${TELEGRAM_USERNAME}`,
    QR_CODE: '/image/hopehubindiaqr.jpg',
  },
  WHATSAPP: {
    GROUP_URL: 'https://chat.whatsapp.com/CbbNoo5kXw3FWWKTGO82kz',
    QR_CODE: '/image/whatsapp-qr.png',
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
