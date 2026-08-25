BEGIN;

UPDATE "SiteConfig"
SET "value" = '+91 93044 71227', "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'contactPhone'
  AND "value" IN ('+91-98765-43210', '+91 98765 43210', '9876543210');

UPDATE "SiteConfig"
SET "value" = '+919304471227', "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'contactPhoneTel'
  AND "value" IN ('+919876543210', '919876543210', '9876543210');

UPDATE "SiteConfig"
SET "value" = '919304471227', "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'whatsappPhone'
  AND "value" IN ('919876543210', '+919876543210', '9876543210');

COMMIT;
