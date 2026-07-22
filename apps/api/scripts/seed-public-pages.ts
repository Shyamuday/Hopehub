import 'dotenv/config';
import { seedPublicPages } from '../src/services/public-pages.js';
import { prisma } from '../src/db.js';

try {
  const result = await seedPublicPages();
  console.log(
    `Public pages seeded: ${result.created} created, ${result.updated} updated, ${result.total} total.`
  );
} finally {
  await prisma.$disconnect();
}
