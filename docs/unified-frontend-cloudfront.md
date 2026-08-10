# Unified frontend CloudFront

HopeHub can keep the API separate and serve all frontend apps through one CloudFront distribution.

## Target routing

```text
hopehub.in              -> /healing/index.html
www.hopehub.in          -> /healing/index.html
mind.hopehub.in         -> /patient/index.html
user.hopehub.in         -> /patient/index.html
patient.hopehub.in      -> /patient/index.html
admin.hopehub.in        -> /admin/index.html
ph.hopehub.in           -> /doctor/index.html
ops.hopehub.in          -> /operations/index.html
operations.hopehub.in   -> /operations/index.html
healing.hopehub.in      -> /healing/index.html
hub.hopehub.in          -> /healing/index.html
```

`api.hopehub.in` stays outside this distribution.

## S3 layout

Set `FRONTEND_BUCKET` in `deploy/config/production.env` or the production deploy environment.
The GitHub deploy workflow uploads:

```text
s3://$FRONTEND_BUCKET/patient/...
s3://$FRONTEND_BUCKET/admin/...
s3://$FRONTEND_BUCKET/doctor/...
s3://$FRONTEND_BUCKET/operations/...
s3://$FRONTEND_BUCKET/healing/...
```

The older per-app buckets can stay during migration.

## CloudFront Function

Attach `deploy/cloudfront/frontend-host-router.js` to the distribution as a viewer-request function.

It rewrites requests by hostname:

- `/login` on `admin.hopehub.in` -> `/admin/index.html`
- `/main.js` on `ph.hopehub.in` -> `/doctor/main.js`
- `/patient/dashboard` on `mind.hopehub.in` -> `/patient/index.html`
- `/` on `hopehub.in` -> `/healing/index.html`

This keeps Angular apps built with base href `/`.

## Required CloudFront settings

- One S3 origin: the unified frontend bucket.
- Viewer protocol policy: redirect HTTP to HTTPS.
- Alternate domain names: all frontend domains.
- Certificate: ACM certificate in `us-east-1` covering all frontend domains.
- Default root object can be `patient/index.html`, but the function handles `/`.
- Attach the function on viewer request for the default behavior.

## Deploy workflow variables

```text
FRONTEND_BUCKET=<single frontend bucket>
FRONTEND_CLOUDFRONT_DISTRIBUTION_ID=<single frontend distribution id>
```

When `FRONTEND_BUCKET` is empty, unified deploy is skipped and the legacy per-app bucket deploy continues.
When `FRONTEND_CLOUDFRONT_DISTRIBUTION_ID` is set, the workflow invalidates `/*` after uploading selected frontends.

## DNS cutover

After the distribution is deployed and tested, point frontend DNS records to it:

```text
hopehub.in
www.hopehub.in
mind.hopehub.in
admin.hopehub.in
ph.hopehub.in
ops.hopehub.in
```

Keep `api.hopehub.in` pointed to the backend.
