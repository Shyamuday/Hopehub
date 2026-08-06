import 'dotenv/config';
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketEncryptionCommand,
  PutBucketLifecycleConfigurationCommand,
  PutBucketVersioningCommand,
  PutPublicAccessBlockCommand,
  S3Client
} from '@aws-sdk/client-s3';

const region =
  process.env.DATABASE_BACKUP_BUCKET_REGION || process.env.ASSET_BUCKET_REGION || 'us-east-1';
const bucket = process.env.DATABASE_BACKUP_BUCKET;

if (!bucket) {
  throw new Error('DATABASE_BACKUP_BUCKET is required.');
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

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const exists = await bucketExists();
  if (dryRun) {
    console.log(
      JSON.stringify({
        bucket,
        region,
        exists,
        action: exists ? 'configure' : 'create-and-configure'
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

  await Promise.all([
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
    ),
    s3.send(
      new PutBucketLifecycleConfigurationCommand({
        Bucket: bucket,
        LifecycleConfiguration: {
          Rules: [
            {
              ID: 'expire-daily-postgres-snapshots',
              Status: 'Enabled',
              Filter: { Prefix: 'postgres/daily/' },
              Expiration: { Days: 35 },
              NoncurrentVersionExpiration: { NoncurrentDays: 7 },
              AbortIncompleteMultipartUpload: { DaysAfterInitiation: 7 }
            },
            {
              ID: 'expire-monthly-postgres-snapshots',
              Status: 'Enabled',
              Filter: { Prefix: 'postgres/monthly/' },
              Expiration: { Days: 366 },
              NoncurrentVersionExpiration: { NoncurrentDays: 30 },
              AbortIncompleteMultipartUpload: { DaysAfterInitiation: 7 }
            },
            {
              ID: 'expire-postgres-wal-archives',
              Status: 'Enabled',
              Filter: { Prefix: 'postgres/wal/' },
              Expiration: { Days: 35 },
              AbortIncompleteMultipartUpload: { DaysAfterInitiation: 7 }
            }
          ]
        }
      })
    )
  ]);

  console.log(JSON.stringify({ bucket, region, created: !exists, configured: true }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
