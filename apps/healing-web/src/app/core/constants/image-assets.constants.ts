export const PUBLIC_IMAGE_BASE_URL =
  'https://hopehub-public-assets-924479393196.s3.us-east-1.amazonaws.com';

export const IMAGE_ASSETS = {
  BASE_URL: PUBLIC_IMAGE_BASE_URL,
  BRAND: {
    LOGO: `${PUBLIC_IMAGE_BASE_URL}/brand/hopehublogom.jpg`,
    APP_ICON: `${PUBLIC_IMAGE_BASE_URL}/brand/hopehublogom.jpg`,
    OG_IMAGE: `${PUBLIC_IMAGE_BASE_URL}/brand/hopehublogom.jpg`,
    FULL_LOGO: `${PUBLIC_IMAGE_BASE_URL}/brand/hopehublogo.png`,
    SVG_LOGO: `${PUBLIC_IMAGE_BASE_URL}/brand/logo.svg`,
  },
  QR: {
    TELEGRAM: `${PUBLIC_IMAGE_BASE_URL}/qr/telegram/hopehubindiaqr.jpg`,
    WHATSAPP: `${PUBLIC_IMAGE_BASE_URL}/qr/whatsapp/whatsapp-qr.jpeg`,
  },
  PAYMENTS: {
    UPI_QR: `${PUBLIC_IMAGE_BASE_URL}/payments/upi/upiqr.jpg`,
  },
  SERVICES: {
    SUNRISE: `${PUBLIC_IMAGE_BASE_URL}/services/hopehub-healing-sunrise.png`,
    MEDITATION: `${PUBLIC_IMAGE_BASE_URL}/services/hopehub-hero-meditation.png`,
    NATURE: `${PUBLIC_IMAGE_BASE_URL}/services/hopehub-calm-nature.png`,
    FLOW: `${PUBLIC_IMAGE_BASE_URL}/services/hopehub-abstract-flow.png`,
  },
} as const;
