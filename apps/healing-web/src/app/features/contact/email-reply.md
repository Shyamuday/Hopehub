Hello AWS SES Team,

Thank you for reviewing our request. We are requesting Amazon SES production access for our verified domain `hopehub.in`.

Our use case is transactional and user-requested email for Hope Hub, a mental health and wellness platform. We plan to send emails only to users, patients, donors, and visitors who interact with our website or applications.

Planned email types:

- Account verification and login-related emails
- Password reset emails
- Appointment booking confirmations
- Consultation payment confirmations
- Contact form acknowledgements
- Donation receipts and payment status emails
- Important service or account notifications
- Occasional opt-in newsletters, wellness updates, and promotional emails for users who explicitly subscribe or consent

Expected sending volume:

- Initial volume: fewer than 200 emails per day
- Near-term expected volume: 500 to 1,000 emails per day as users increase
- Sending pattern: mostly transactional, triggered by user actions, with occasional permission-based newsletters or wellness campaigns
- Marketing or newsletter emails will only be sent to users who explicitly opt in or consent to receive them

Recipient list management:

- Recipients are collected only when users register, submit a contact form, book an appointment, make a donation, or otherwise request communication from Hope Hub.
- We do not buy, rent, scrape, or import third-party mailing lists.
- Each recipient email address is submitted directly by the user.
- For transactional emails, we send only messages related to the user's own account, request, booking, or payment.
- For marketing or newsletter emails, we will use only first-party opt-in subscribers and will not send to users who have unsubscribed.

Bounce and complaint handling:

- We will monitor SES bounce and complaint metrics regularly.
- We will configure Amazon SNS/webhook handling for bounces and complaints.
- Hard-bounced addresses will be suppressed and not contacted again.
- Addresses that generate complaints will be suppressed immediately.
- We will use the SES account-level suppression list and maintain application-level suppression where needed.

Unsubscribe and opt-out process:

- Transactional emails such as OTP, password reset, booking confirmation, and payment confirmation are sent only when required for the user's requested action.
- Newsletters, wellness updates, promotional messages, and other non-transactional emails will include a clear unsubscribe link.
- Any user who opts out of non-essential communication will be removed from future non-transactional messages.
- We will continue to send only required account, security, booking, and payment emails where legally and operationally necessary.

Sending quality and compliance:

- We will send from verified domain-based addresses under `hopehub.in`.
- We have configured DNS records for domain verification and email authentication.
- We will maintain SPF, DKIM, and DMARC records for the sending domain.
- We will not send spam, unsolicited promotional emails, or purchased-list campaigns.
- We will send marketing email only to users who have provided permission, and we will honor unsubscribe requests promptly.
- We will keep bounce and complaint rates within AWS recommended limits.
- We will follow AWS Acceptable Use Policy and SES sending best practices.

Sample email content:

Subject: Your Hope Hub appointment is confirmed

Hello {{userName}},

Your Hope Hub consultation has been confirmed.

Service: {{serviceName}}
Date: {{appointmentDate}}
Time: {{appointmentTime}}

Please log in to your Hope Hub account if you need to view your booking details or contact support.

Thank you,
Hope Hub Team
https://hopehub.in

Another sample:

Subject: Reset your Hope Hub password

Hello {{userName}},

We received a request to reset the password for your Hope Hub account. Please use the secure link below to reset your password:

{{resetLink}}

If you did not request this, you can safely ignore this email.

Thank you,
Hope Hub Team
https://hopehub.in

We confirm that our domain identity is verified or being verified before production sending, and we will use SES only for legitimate user-requested communication from Hope Hub.

Please let us know if you need any additional details.

Thank you,
Hope Hub Team
