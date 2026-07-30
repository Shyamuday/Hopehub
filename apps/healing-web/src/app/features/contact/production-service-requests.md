# Production Service Requests Checklist

This note tracks third-party services and approvals needed for Hope Hub production launch across `hopehub.in` and `api.hopehub.in`.

## Already In Progress

### Razorpay Payment Gateway

- Submit `https://hopehub.in` for paid bookings.
- Keep privacy policy, terms, refund policy, payment policy, service delivery policy, contact details, and pricing visible.
- Configure webhook on backend:
  - `https://api.hopehub.in/payments/razorpay-webhook`
- Required backend env:
  - `RAZORPAY_KEY_ID`
  - `RAZORPAY_KEY_SECRET`
  - `RAZORPAY_WEBHOOK_SECRET`

### AWS SES SMTP Production Access

- Request production access for verified domain `hopehub.in`.
- Use domain-based senders such as `contact@hopehub.in`, `support@hopehub.in`, or `care@hopehub.in`.
- Configure SPF, DKIM, DMARC, bounce handling, complaint handling, unsubscribe handling, and suppression list.
- Use transactional emails for OTP, password reset, booking confirmation, payment confirmation, and refund updates.

## High Priority Next

### WhatsApp Business API / Meta Cloud API

- Needed for official WhatsApp booking updates, payment reminders, session reminders, OTP, support updates, and approved marketing templates.
- Requires Meta Business verification.
- Message templates need approval before production use.
- Store user consent before sending promotional messages.

### SMS Provider + India DLT Registration

- Needed if we send SMS OTP, appointment reminders, payment confirmations, or urgent alerts.
- India requires DLT entity registration, sender ID, and approved message templates.
- Keep SMS fallback useful for users who do not use WhatsApp or email.

### Google OAuth

- Needed if Google login is enabled in production.
- Configure OAuth consent screen, authorized domains, and redirect URLs for both apps if used.
- Do not expose Google login button unless production OAuth is configured.

### TURN Server For WebRTC

- Needed for reliable voice/video calls on strict networks.
- Options:
  - Self-host Coturn on AWS EC2.
  - Use managed TURN such as Twilio Network Traversal, Metered.ca, or Xirsys.
- Backend should expose short-lived ICE credentials through `/rtc/ice-servers`.

## Medium Priority

### Web Push Notifications

- Useful for doctor assigned, session reminder, payment status, and follow-up notifications.
- Requires browser push permission flow and unsubscribe support.

### Google Search Console

- Add and verify:
  - `https://hopehub.in`
  - `https://hopehub.in`
- Submit both sitemaps.
- Monitor indexing, mobile usability, structured data, and no-JS content checks.

### Google Analytics / Tag Manager

- Track traffic, booking funnel, assessment completion, payment started, payment success, and payment failure.
- Privacy policy must disclose analytics usage.

### reCAPTCHA / Cloudflare Turnstile

- Protect contact, career, feedback, signup, and review forms from spam.
- Turnstile is often simpler and less intrusive.

## Marketing Requirements

### Email Marketing Controls

- Required before sending bulk marketing email through SES or any provider.
- Must include:
  - Explicit opt-in/consent.
  - Unsubscribe link.
  - Suppression list.
  - Bounce and complaint processing.
  - Campaign audit/history.

### WhatsApp Marketing Templates

- Marketing messages require approved WhatsApp templates.
- Keep mental health messaging careful, non-invasive, and consent-based.

## Operational Services

### AWS CloudFront, S3, Route 53, ACM

- Current target mapping:
  - `hopehub.in` -> user-web
  - `hopehub.in` -> healing-web
  - `api.hopehub.in` -> backend API
- ACM certificate for CloudFront must be in `us-east-1`.
- Invalidate CloudFront after each production deploy.

### Monitoring And Error Tracking

- Add CloudWatch alarms for API errors, payment webhook failures, email bounces, and high latency.
- Consider Sentry or similar frontend/backend error tracking.

### Backups And Audit Logs

- Database automated backups.
- Payment audit table and refund records are already planned/implemented in backend.
- Keep logs for payment webhook id, failure reason, refund id, and gateway event payload references.

## Suggested Approval Order

1. Razorpay approval.
2. AWS SES production access.
3. WhatsApp Business API.
4. SMS DLT registration if SMS OTP/alerts are required.
5. TURN server setup before enabling WebRTC calls.
6. Search Console and Analytics.
7. reCAPTCHA or Turnstile for public forms.
