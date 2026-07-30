# HopeHub Asset Storage

HopeHub user-uploaded and managed assets live in one private S3 bucket:

```text
hopehub-assets
```

The API selects storage from environment variables:

```text
ASSET_BUCKET=hopehub-assets
ASSET_BUCKET_REGION=us-east-1
```

When `ASSET_BUCKET` is unset, the API falls back to local `uploads/` storage for development.

## Prefix Layout

```text
profile-images/users/{userId}/{uuid}.{ext}
profile-images/store-staff/{staffId}/{uuid}.{ext}
clinical-media/{patientId}/{uuid}.{ext}
cms/{assetType}/{uuid}.{ext}
public-site/{app}/{assetName}
tmp/{uuid}
```

## Access Model

The bucket is private. User uploads should be accessed through authenticated API routes unless a specific asset is intentionally made public through a separate CDN or signed URL flow.

Current routes keep their existing URLs:

```text
/profile-images/users/:userId
/store/profile-images/:staffId
/clinical-media/:mediaId/file
```

## Bucket Guardrails

- Public access is blocked at bucket level.
- Server-side encryption is enabled with S3-managed AES-256 keys.
- Versioning is enabled.
- CORS allows HopeHub production domains and local development ports for future direct-upload support.
- Incomplete multipart uploads are aborted after 7 days.

## Production API Credentials

The Lightsail deploy script writes S3 credentials into `apps/api/.env`. It first checks these server-side files:

```text
/etc/hopehub-aws-access-key-id
/etc/hopehub-aws-secret-access-key
```

If those files are absent, the GitHub Actions API deploy job passes `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` from the production environment secrets.

Use a least-privilege IAM user or role for the API. The reusable policy is checked in at:

```text
deploy/aws/hopehub-assets-api-policy.json
```

It has also been created in AWS:

```text
arn:aws:iam::924479393196:policy/HopeHubAssetsApiS3Access
```

The policy only allows access to the asset bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::hopehub-assets/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::hopehub-assets"
    }
  ]
}
```

## Migrating Existing Local Uploads

After deploying the S3 storage code, old local files can be copied to S3 without changing database keys:

```bash
cd /opt/hopehub/apps/api
ASSET_BUCKET=hopehub-assets ASSET_BUCKET_REGION=us-east-1 npm run assets:migrate:s3
```

The API can still read legacy local files as a fallback while migration is pending.

## Upload Rules

- Profile images: JPEG, PNG, WebP, max 2 MB.
- Clinical media: JPEG, PNG, WebP, GIF, PDF, max 15 MB.
- Store only generated storage keys in the database, not raw S3 URLs.
- Keep clinical media private because it may contain sensitive health data.
