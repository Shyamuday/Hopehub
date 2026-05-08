create extension if not exists "pgcrypto";

create type public.user_role as enum ('PATIENT', 'DOCTOR', 'ADMIN');
create type public.consultation_status as enum (
  'PAYMENT_PENDING',
  'PAID',
  'ASSIGNED',
  'IN_PROGRESS',
  'PRESCRIPTION_UPLOADED',
  'COMPLETED',
  'CANCELLED'
);
create type public.payment_status as enum ('CREATED', 'PAID', 'FAILED');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  mobile text unique,
  role public.user_role not null default 'PATIENT',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.doctors (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  specialty text not null,
  registration_no text,
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.diseases (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null,
  fee_in_paise integer not null check (fee_in_paise > 0),
  intake_questions jsonb not null default '[]',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.consultations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id),
  disease_id uuid not null references public.diseases(id),
  assigned_doctor_id uuid references public.profiles(id),
  status public.consultation_status not null default 'PAYMENT_PENDING',
  intake_answers jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null unique references public.consultations(id) on delete cascade,
  provider text not null default 'razorpay',
  provider_order_id text,
  provider_payment_id text,
  amount_in_paise integer not null check (amount_in_paise > 0),
  status public.payment_status not null default 'CREATED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null unique references public.consultations(id) on delete cascade,
  uploaded_by_id uuid not null references public.profiles(id),
  notes text not null,
  file_url text,
  created_at timestamptz not null default now()
);

create or replace function public.current_role()
returns public.user_role
language sql
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.current_role() = 'ADMIN'
$$;

create or replace function public.is_consultation_party(consultation_row public.consultations)
returns boolean
language sql
security definer
set search_path = public
as $$
  select consultation_row.patient_id = auth.uid()
    or consultation_row.assigned_doctor_id = auth.uid()
    or public.is_admin()
$$;

create or replace function public.bootstrap_admin(admin_email text, admin_name text default 'Clinic Admin')
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_user_id uuid;
begin
  select id into target_user_id
  from auth.users
  where email = admin_email
  limit 1;

  if target_user_id is null then
    raise exception 'No Supabase auth user found for email %', admin_email;
  end if;

  insert into public.profiles (id, name, role)
  values (target_user_id, admin_name, 'ADMIN')
  on conflict (id) do update
    set role = 'ADMIN',
        name = excluded.name,
        updated_at = now();
end;
$$;

alter table public.profiles enable row level security;
alter table public.doctors enable row level security;
alter table public.diseases enable row level security;
alter table public.consultations enable row level security;
alter table public.payments enable row level security;
alter table public.messages enable row level security;
alter table public.prescriptions enable row level security;

create policy "profiles self or admin read" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy "patient creates own profile" on public.profiles
  for insert with check (id = auth.uid() and role = 'PATIENT');

create policy "profiles self update" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "admin manages profiles" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

create policy "active diseases are public" on public.diseases
  for select using (is_active = true);

create policy "admin manages diseases" on public.diseases
  for all using (public.is_admin()) with check (public.is_admin());

create policy "doctors readable by admin" on public.doctors
  for select using (public.is_admin() or profile_id = auth.uid());

create policy "admin manages doctors" on public.doctors
  for all using (public.is_admin()) with check (public.is_admin());

create policy "patient creates own consultation" on public.consultations
  for insert with check (patient_id = auth.uid() and public.current_role() = 'PATIENT');

create policy "consultation parties read" on public.consultations
  for select using (public.is_consultation_party(consultations));

create policy "admin assigns consultations" on public.consultations
  for update using (public.is_admin()) with check (public.is_admin());

create policy "patient updates own consultation" on public.consultations
  for update using (patient_id = auth.uid()) with check (patient_id = auth.uid());

create policy "assigned doctor updates consultation" on public.consultations
  for update using (assigned_doctor_id = auth.uid()) with check (assigned_doctor_id = auth.uid());

create policy "payment parties read" on public.payments
  for select using (
    exists (
      select 1 from public.consultations c
      where c.id = consultation_id and public.is_consultation_party(c)
    )
  );

create policy "patient creates own payment" on public.payments
  for insert with check (
    exists (
      select 1 from public.consultations c
      where c.id = consultation_id and c.patient_id = auth.uid()
    )
  );

create policy "patient updates own payment" on public.payments
  for update using (
    exists (
      select 1 from public.consultations c
      where c.id = consultation_id and c.patient_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.consultations c
      where c.id = consultation_id and c.patient_id = auth.uid()
    )
  );

create policy "messages parties read" on public.messages
  for select using (
    exists (
      select 1 from public.consultations c
      where c.id = consultation_id and public.is_consultation_party(c)
    )
  );

create policy "messages parties insert" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.consultations c
      where c.id = consultation_id and public.is_consultation_party(c)
    )
  );

create policy "prescription parties read" on public.prescriptions
  for select using (
    exists (
      select 1 from public.consultations c
      where c.id = consultation_id and public.is_consultation_party(c)
    )
  );

create policy "doctor admin writes prescriptions" on public.prescriptions
  for all using (public.current_role() in ('DOCTOR', 'ADMIN')) with check (uploaded_by_id = auth.uid());

insert into public.diseases (name, description, fee_in_paise, intake_questions)
values
  (
    'Hair Fall Treatment',
    'First MVP niche focused on hair fall diagnosis, prescription, and follow-up guidance.',
    49900,
    '[
      "How long have you had hair fall?",
      "Do you have dandruff, itching, or scalp infection?",
      "Any recent fever, stress, weight loss, or medication?",
      "Do you have family history of baldness?"
    ]'
  ),
  (
    'Skin Issues',
    'Secondary category for acne, rashes, pigmentation, and allergy complaints.',
    59900,
    '[
      "What skin issue are you facing?",
      "How long has it been present?",
      "Is there itching, pain, discharge, or fever?",
      "Have you used any medicine or cream already?"
    ]'
  )
on conflict (name) do nothing;

insert into storage.buckets (id, name, public)
values ('prescriptions', 'prescriptions', false)
on conflict (id) do nothing;

create policy "prescription files readable by authenticated users"
on storage.objects for select
to authenticated
using (bucket_id = 'prescriptions');

create policy "prescription files writable by doctors and admins"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'prescriptions'
  and public.current_role() in ('DOCTOR', 'ADMIN')
);

create policy "prescription files updatable by doctors and admins"
on storage.objects for update
to authenticated
using (
  bucket_id = 'prescriptions'
  and public.current_role() in ('DOCTOR', 'ADMIN')
)
with check (
  bucket_id = 'prescriptions'
  and public.current_role() in ('DOCTOR', 'ADMIN')
);

-- Consultation attachments are uploaded via API (service role); bucket must exist for Supabase Storage.
insert into storage.buckets (id, name, public)
values ('consultation-attachments', 'consultation-attachments', false)
on conflict (id) do nothing;
