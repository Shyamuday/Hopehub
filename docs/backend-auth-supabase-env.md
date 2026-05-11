# Backend Auth + Supabase Env Setup

Use this guide for the current Vitalis architecture where:

- Angular apps call `apps/api` for auth and business APIs.
- Prisma uses Supabase Postgres as the database.

## 1) Required Supabase values

From Supabase dashboard:

- Project URL (example: `https://<project-ref>.supabase.co`)
- Publishable anon key (frontend-safe)
- Service role key (backend only, secret)
- Postgres connection URI for Prisma (`DATABASE_URL`)

## 2) Configure frontend (`apps/web`)

Set only public values in:

- `apps/web/src/environments/environment.ts`
- `apps/web/src/environments/environment.prod.ts`

Expected shape:

```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:4000',
  supabaseUrl: 'https://<project-ref>.supabase.co',
  supabaseAnonKey: '<publishable-anon-key>'
};
```

Do not put `DATABASE_URL` or service role key in frontend files.

## 3) Configure backend (`apps/api/.env`)

Set secrets in `apps/api/.env`:

```env
DATABASE_URL="postgresql://postgres:<DB_PASSWORD>@db.<project-ref>.supabase.co:5432/postgres?sslmode=verify-full"
JWT_SECRET="change-this-before-production"
PORT=4000
WEB_ORIGIN="http://localhost:4200"
DEV_OTP="123456"
RAZORPAY_KEY_ID=""
RAZORPAY_KEY_SECRET=""
RAZORPAY_WEBHOOK_SECRET=""
GOOGLE_CLIENT_ID=""
SUPABASE_URL="https://<project-ref>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
```

Important:

- URL-encode special characters in DB password (`@`, `#`, `%`, `/`, `:`).
- `.env` values must not contain trailing commas.
- Use `DATABASE_URL="..."` format (no extra spaces before/after `=`).

## 4) Set/Reset Supabase DB password

In Supabase:

1. `Project Settings` -> `Database`
2. Set or reset database password
3. Wait 1-2 minutes
4. Copy URI from `Connection string` and update `DATABASE_URL`

## 5) Run Prisma sync

From `apps/api`:

```powershell
npm run prisma:migrate
npm run prisma:generate
```

## 6) If you get P1001 (cannot reach DB)

Symptoms: `Can't reach database server at db.<project-ref>.supabase.co` or Prisma `P1001`.

Work through these in order:

1. **Project running**  
   In the Supabase dashboard, open the project and **restore it** if it is paused (free-tier projects pause after inactivity). Wait until the project shows as ready.

2. **Fresh URI**  
   Go to **Project Settings → Database → Connection string → URI**. Paste into `apps/api/.env` as `DATABASE_URL`. Do not guess the hostname: Supabase may show a **pooler** host (for example `aws-0-<region>.pooler.supabase.com`) instead of `db.<ref>.supabase.co`.

3. **DNS**  
   If `db.<ref>.supabase.co` does not resolve (Windows: `Test-NetConnection db.<ref>.supabase.co -Port 5432`), your network may block Supabase DNS or the project ref is wrong. Use the URI exactly as copied from the dashboard, or try another network/VPN.

4. **Port 5432 blocked**  
   Some networks block outbound `5432`. Use the **Session pooler** URI on port **6543** from the same Database settings page. For Prisma + PgBouncer-style pooling, include `pgbouncer=true` in the query string when the provider recommends it.

```env
DATABASE_URL="postgresql://postgres.<project-ref>:<DB_PASSWORD>@<pooler-host-from-dashboard>:6543/postgres?sslmode=verify-full&pgbouncer=true"
```

Notes:

- `prisma migrate dev` is easiest with **direct** database access (`:5432`). Use the direct URI for migrations when possible; use the pooler for day-to-day API runs if only the pooler works on your network.
- After changing `DATABASE_URL`, verify with: `npm run db:verify --prefix apps/api` (from repo root: `npm run db:verify`).

5. **SSL / `pg` warning**  
   Use `sslmode=verify-full` in `DATABASE_URL` (matches current `pg` behavior and avoids deprecation noise from plain `require`).

## 7) Auth-specific checklist

For backend auth flow to work:

- `JWT_SECRET` is set in `apps/api/.env`
- `WEB_ORIGIN` matches the web app URL
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in backend
- Frontend points to API via `apiUrl`
- Frontend keeps only `supabaseUrl` and `supabaseAnonKey` as public config
