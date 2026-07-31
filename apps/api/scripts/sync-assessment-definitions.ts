import 'dotenv/config';
import { Prisma } from '@prisma/client';
import { prisma } from '../src/db.js';

type AssessmentConfig = {
  id: string;
  type: string;
  category: string;
  title: string;
  description: string;
};

type AssessmentConfigModule = {
  ASSESSMENT_CONFIGS?: AssessmentConfig[];
  default?: {
    ASSESSMENT_CONFIGS?: AssessmentConfig[];
  };
};

async function loadFrontendAssessmentConfigs() {
  const mod =
    (await import('../../healing-web/src/app/core/data/assessment-configs')) as AssessmentConfigModule;
  const configs = mod.ASSESSMENT_CONFIGS ?? mod.default?.ASSESSMENT_CONFIGS;
  if (!configs?.length) {
    throw new Error('No frontend assessment configs were found to sync.');
  }
  return configs;
}

function toJson(config: AssessmentConfig) {
  return JSON.parse(JSON.stringify(config)) as Prisma.InputJsonValue;
}

async function main() {
  const configs = await loadFrontendAssessmentConfigs();
  const dryRun = process.argv.includes('--dry-run');

  if (dryRun) {
    console.log(`Found ${configs.length} assessment definitions to sync.`);
    return;
  }

  for (const [index, config] of configs.entries()) {
    await prisma.$executeRaw`
      INSERT INTO "AssessmentDefinition" (
        "id",
        "type",
        "category",
        "title",
        "description",
        "version",
        "config",
        "isActive",
        "sortOrder",
        "updatedAt"
      )
      VALUES (
        ${config.id},
        ${config.type},
        ${config.category},
        ${config.title},
        ${config.description},
        'v1',
        ${toJson(config)}::jsonb,
        true,
        ${index * 10},
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("id") DO UPDATE SET
        "type" = EXCLUDED."type",
        "category" = EXCLUDED."category",
        "title" = EXCLUDED."title",
        "description" = EXCLUDED."description",
        "version" = EXCLUDED."version",
        "config" = EXCLUDED."config",
        "isActive" = true,
        "sortOrder" = EXCLUDED."sortOrder",
        "updatedAt" = CURRENT_TIMESTAMP
    `;
  }

  console.log(`Synced ${configs.length} assessment definitions.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
