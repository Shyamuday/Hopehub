# Supabase Setup Guide

Use this when you are ready to connect Vitalis Care and Research Centre to a real Supabase project.

## 1. Create Supabase Project

Create a new project in Supabase and copy:

- Project URL
- Publishable anon key

Update these files:

```ts
// apps/web/src/environments/environment.ts
// apps/web/src/environments/environment.prod.ts
supabaseUrl: 'https://your-project.supabase.co',
supabaseAnonKey: 'your-publishable-anon-key'
```

## 2. Run Database Schema

Open Supabase SQL Editor and run the full contents of:

```text
supabase/schema.sql
```

This creates:

- Profiles and role system
- Doctors
- Diseases
- Consultations
- Payments
- Messages
- Prescriptions
- RLS policies
- Prescription storage bucket
- Admin bootstrap helper

## 3. Enable Auth Providers

In Supabase dashboard, enable:

- Email/password login
- Phone OTP login
- Google OAuth login

For Google OAuth, configure Google Cloud OAuth and add the Supabase callback URL shown in Supabase Auth provider settings.

## 4. Create First Admin

Create a user in Supabase Auth using your admin email.

Then run this in Supabase SQL Editor:

```sql
select public.bootstrap_admin('your-admin-email@example.com', 'Clinic Admin');
```

After this, that user can access the admin dashboard.

## 5. Deploy Doctor Creation Function

Install and login to Supabase CLI.

```powershell
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref
supabase functions deploy create-doctor
```

The function uses these Supabase environment values:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Set them in Supabase Function secrets if they are not already available:

```powershell
supabase secrets set SUPABASE_URL="https://your-project.supabase.co"
supabase secrets set SUPABASE_ANON_KEY="your-anon-key"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

Never expose the service role key in Angular or any frontend code.

## 6. Local Test Flow

Start Angular:

```powershell
npm run dev:web
```

Test:

1. Patient logs in with phone OTP.
2. Patient selects disease and creates consultation.
3. Patient marks payment as paid in MVP flow.
4. Admin logs in and assigns doctor.
5. Doctor logs in and opens assigned consultation.
6. Patient/doctor chat.
7. Doctor uploads prescription.
8. Doctor marks consultation complete.

## Notes

- `apps/api` remains as the TypeScript backend for future Razorpay/private server logic.
- Razorpay now uses server-side order creation, checkout signature verification, and a webhook endpoint.
- Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` in `apps/api/.env` for local payment testing.
- Configure Razorpay webhook URL as `/payments/razorpay-webhook` on your deployed API.
