# Razorpay Setup Guide

Use this when you are ready to enable real payments.

## 1. Create Razorpay Account

Create or login to Razorpay Dashboard and get API keys:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

For local development, use Razorpay test mode keys first.

## 2. Configure API Environment

Update:

```text
apps/api/.env
```

Required values:

```text
RAZORPAY_KEY_ID="your_key_id"
RAZORPAY_KEY_SECRET="your_key_secret"
RAZORPAY_WEBHOOK_SECRET="your_webhook_secret"
```

Never put Razorpay secrets in frontend code.

## 3. Payment Flow

Current production-style flow:

1. Patient clicks `Pay now`.
2. Angular calls TypeScript API:
   ```text
   POST /payments/:consultationId/create-order
   ```
3. API creates Razorpay order.
4. Angular opens Razorpay Checkout.
5. Razorpay returns payment response to Angular.
6. Angular calls TypeScript API:
   ```text
   POST /payments/:consultationId/verify
   ```
7. API verifies Razorpay signature.
8. API updates database via Prisma:
   - `payments.status = PAID`
   - `consultations.status = PAID`
9. API emits `payment:updated` Socket.io event to patient client.

## 4. Webhook Setup

In Razorpay Dashboard, add webhook URL:

```text
https://your-api-domain.com/payments/razorpay-webhook
```

Recommended event:

```text
payment.captured
```

Generate a webhook secret in Razorpay and save it as:

```text
RAZORPAY_WEBHOOK_SECRET
```

The webhook gives server-side backup confirmation even if the user's browser closes after payment.

## 5. Local Testing

Run API:

```powershell
npm run dev:api
```

Run Angular:

```powershell
npm run dev:user
```

Use Razorpay test card/payment methods from Razorpay documentation.

For webhooks during local development, expose the API using a tunnel such as ngrok:

```powershell
ngrok http 4000
```

Then set Razorpay webhook URL to:

```text
https://your-ngrok-url.ngrok-free.app/payments/razorpay-webhook
```

## 6. Production Checklist

- Use Razorpay live keys.
- Deploy `apps/api` to a secure HTTPS domain.
- Set `WEB_ORIGIN` to the deployed Angular domain.
- Set `RAZORPAY_WEBHOOK_SECRET`.
- Test successful payment.
- Test cancelled payment.
- Test failed payment.
- Test webhook delivery from Razorpay Dashboard.
- Confirm database status updates only after verified payment.
