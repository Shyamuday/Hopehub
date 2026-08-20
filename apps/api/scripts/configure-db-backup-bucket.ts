import 'dotenv/config';
import {
  CreateBucketCommand,
  GetBucketLifecycleConfigurationCommand,
  HeadBucketCommand,
  type LifecycleRule,
  PutBucketEncryptionCommand,
  PutBucketLifecycleConfigurationCommand,
  PutBucketVersioningCommand,
  PutPublicAccessBlockCommand,
  S3Client
} from '@aws-sdk/client-s3';

const region =
  process.env.DATABASE_BACKUP_BUCKET_REGION || process.env.ASSET_BUCKET_REGION || 'us-east-1';
const bucket = process.env.DATABASE_BACKUP_BUCKET || process.env.ASSET_BUCKET;
const backupPrefix = (process.env.DATABASE_BACKUP_PREFIX || 'private-backups/postgres').replace(
  /^\/+|\/+$/g,
  ''
);

const managedLifecycleRuleIds = new Set([
  'expire-daily-postgres-snapshots',
  'expire-monthly-postgres-snapshots',
  'expire-postgres-wal-archives'
]);

if (!bucket) {
  throw new Error('DATABASE_BACKUP_BUCKET or ASSET_BUCKET is required.');
}

const s3 = new S3Client({ region });

async function bucketExists() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    return true;
  } catch (error: any) {
    const status = error?.$metadata?.httpStatusCode;
    if (status === 404 || error?.name === 'NotFound') return false;
    throw error;
  }
}

async function existingLifecycleRules(): Promise<LifecycleRule[]> {
  try {
    const lifecycle = await s3.send(new GetBucketLifecycleConfigurationCommand({ Bucket: bucket }));
    return lifecycle.Rules ?? [];
  } catch (error: any) {
    const status = error?.$metadata?.httpStatusCode;
    if (status === 404 || error?.name === 'NoSuchLifecycleConfiguration') return [];
    throw error;
  }
}

function backupLifecycleRules(): LifecycleRule[] {
  return [
    {
      ID: 'expire-daily-postgres-snapshots',
      Status: 'Enabled',
      Filter: { Prefix: `${backupPrefix}/daily/` },
      Expiration: { Days: 35 },
      NoncurrentVersionExpiration: { NoncurrentDays: 7 },
      AbortIncompleteMultipartUpload: { DaysAfterInitiation: 7 }
    },
    {
      ID: 'expire-monthly-postgres-snapshots',
      Status: 'Enabled',
      Filter: { Prefix: `${backupPrefix}/monthly/` },
      Expiration: { Days: 366 },
      NoncurrentVersionExpiration: { NoncurrentDays: 30 },
      AbortIncompleteMultipartUpload: { DaysAfterInitiation: 7 }
    },
    {
      ID: 'expire-postgres-wal-archives',
      Status: 'Enabled',
      Filter: { Prefix: `${backupPrefix}/wal/` },
      Expiration: { Days: 35 },
      AbortIncompleteMultipartUpload: { DaysAfterInitiation: 7 }
    }
  ];
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const lifecycleOnly = process.argv.includes('--lifecycle-only');
  const exists = await bucketExists();
  const currentRules = exists ? await existingLifecycleRules() : [];
  const retainedRules = currentRules.filter(
    (rule) => !rule.ID || !managedLifecycleRuleIds.has(rule.ID)
  );
  const lifecycleRules = [...retainedRules, ...backupLifecycleRules()];

  if (dryRun) {
    console.log(
      JSON.stringify({
        bucket,
        region,
        backupPrefix,
        exists,
        lifecycleOnly,
        action: exists ? 'configure' : 'create-and-configure',
        retainedRuleIds: retainedRules.map((rule) => rule.ID).filter(Boolean),
        managedRules: backupLifecycleRules().map((rule) => ({
          id: rule.ID,
          prefix: rule.Filter && 'Prefix' in rule.Filter ? rule.Filter.Prefix : undefined,
          expirationDays: rule.Expiration?.Days
        }))
      })
    );
    return;
  }

  if (!exists) {
    await s3.send(
      new CreateBucketCommand({
        Bucket: bucket,
        ...(region === 'us-east-1'
          ? {}
          : { CreateBucketConfiguration: { LocationConstraint: region } })
      })
    );
  }

  const operations = [
    s3.send(
      new PutBucketLifecycleConfigurationCommand({
        Bucket: bucket,
        LifecycleConfiguration: { Rules: lifecycleRules }
      })
    )
  ];

  if (!lifecycleOnly) {
    operations.push(
      s3.send(
        new PutPublicAccessBlockCommand({
          Bucket: bucket,
          PublicAccessBlockConfiguration: {
            BlockPublicAcls: true,
            IgnorePublicAcls: true,
            BlockPublicPolicy: true,
            RestrictPublicBuckets: true
          }
        })
      ),
      s3.send(
        new PutBucketEncryptionCommand({
          Bucket: bucket,
          ServerSideEncryptionConfiguration: {
            Rules: [
              {
                ApplyServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' },
                BucketKeyEnabled: true
              }
            ]
          }
        })
      ),
      s3.send(
        new PutBucketVersioningCommand({
          Bucket: bucket,
          VersioningConfiguration: { Status: 'Enabled' }
        })
      )
    );
  }

  await Promise.all(operations);

  console.log(
    JSON.stringify({
      bucket,
      region,
      backupPrefix,
      created: !exists,
      configured: true,
      retainedRules: retainedRules.length,
      managedRules: managedLifecycleRuleIds.size
    })
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
