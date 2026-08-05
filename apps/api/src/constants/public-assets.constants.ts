export const PUBLIC_ASSET_BASE_URL =
  process.env.PUBLIC_ASSET_BASE_URL?.replace(/\/+$/, '') ||
  'https://hopehub-public-assets-924479393196.s3.us-east-1.amazonaws.com';

export const PUBLIC_IMAGE_ASSETS = {
  BASE_URL: PUBLIC_ASSET_BASE_URL,
  QR: {
    TELEGRAM: `${PUBLIC_ASSET_BASE_URL}/qr/telegram/hopehubindiaqr.jpg`,
    WHATSAPP: `${PUBLIC_ASSET_BASE_URL}/qr/whatsapp/whatsapp-qr.jpeg`
  }
} as const;
