# AWS SES Email Setup

Hope Hub sends email only from the backend API. Do not put SES credentials in any frontend app.

Automated system mail, public replies, and website contact mail should use the verified sender `contact@hopehub.in`.

## Required SES Setup

1. Verify the sender domain in SES, preferably `hopehub.in`.
2. Add the SES DNS records in Route 53:
   - DKIM CNAME records
   - SPF/TXT record if SES provides one
   - DMARC TXT record, recommended: `_dmarc.hopehub.in`
3. Create SES SMTP credentials in the same SES region.
4. If the account is still in SES sandbox, request production access before sending to unverified users.

## Server Secret Files

Create these files on the API server:

```bash
sudo sh -c 'printf "%s" "email-smtp.us-east-1.amazonaws.com" > /etc/hopehub-ses-smtp-host'
sudo sh -c 'printf "%s" "587" > /etc/hopehub-ses-smtp-port'
sudo sh -c 'printf "%s" "SES_SMTP_USERNAME" > /etc/hopehub-ses-smtp-username'
sudo sh -c 'printf "%s" "SES_SMTP_PASSWORD" > /etc/hopehub-ses-smtp-password'
sudo sh -c 'printf "%s" "contact@hopehub.in" > /etc/hopehub-ses-from'
sudo chmod 600 /etc/hopehub-ses-smtp-* /etc/hopehub-ses-from
```

Use the correct SES SMTP host for the verified region. For N. Virginia use:

```text
email-smtp.us-east-1.amazonaws.com
```

## Deploy And Verify

After the secret files are present, deploy/restart the API:

```bash
bash deploy/scripts/deploy-api-local.sh
```

Check email configuration:

```bash
curl https://api.hopehub.in/health/email
```

## Inbound Contact Email

`contact@hopehub.in` receives through SES inbound in `us-east-1`.

Current setup:

```text
Route 53 MX: hopehub.in -> 10 inbound-smtp.us-east-1.amazonaws.com.
SES receipt rule set: hopehub-contact-inbound
SES receipt rule: contact-hopehub-in
S3 inbox bucket: hopehub-contact-inbox
S3 prefix: contact/
```

SES inbound stores raw email objects in S3. The admin app reads those messages in **Inbox & Email** and can reply using SES SMTP from `contact@hopehub.in`. Automated OTP/system email also uses `contact@hopehub.in`.

Admin test email endpoint:

```bash
curl -X POST https://api.hopehub.in/admin/notifications/email-test \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"to":"your-test-email@example.com"}'
```

## What Uses SES

- Patient OTP email login
- Admin notification broadcasts using channel `EMAIL`
- Future app emails through the shared backend `sendEmail` service
