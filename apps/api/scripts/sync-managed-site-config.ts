import 'dotenv/config';
import { prisma } from '../src/db.js';
import { syncManagedSiteConfigDefaults } from '../src/services/site-config.service.js';

try {
  await syncManagedSiteConfigDefaults();
  console.log('[config-sync] Managed site configuration defaults are current.');
} finally {
  await prisma.$disconnect();
}
