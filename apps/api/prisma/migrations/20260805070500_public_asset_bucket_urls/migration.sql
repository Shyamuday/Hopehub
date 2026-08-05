UPDATE "SiteConfig"
SET
  "value" = 'https://hopehub-public-assets-924479393196.s3.us-east-1.amazonaws.com/qr/telegram/hopehubindiaqr.jpg',
  "updatedAt" = NOW()
WHERE "key" = 'telegramQrCodePath'
  AND "value" IN ('/image/hopehubindiaqr.jpg', '/image/hopehubindiaqr.png', '');

UPDATE "SiteConfig"
SET
  "value" = 'https://hopehub-public-assets-924479393196.s3.us-east-1.amazonaws.com/qr/whatsapp/whatsapp-qr.jpeg',
  "updatedAt" = NOW()
WHERE "key" = 'whatsappQrCodePath'
  AND "value" IN ('/image/whatsapp-qr.jpeg', '/image/whatsapp-qr.jpg', '/image/whatsappqr.jpg', '');
