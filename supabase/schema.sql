-- Talent Bridge Recruitment Management System
-- Relational PostgreSQL Schema for Supabase
-- Includes: profiles, workers, clients, applications, placements, payments
-- Enforces UUID PKs, timestamps, foreign keys, indexes, constraints, and Row Level Security (RLS)

create extension if not exists "pgcrypto";

-- Shared updated_at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1. Staff Profiles (linked to Supabase Auth users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role_title text not null default 'Agency Staff',
  agency_name text not null default 'Talent Bridge Recruitment Agency',
  agency_location text not null default 'Ntinda, Kampala, Uganda',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 2. Domestic Workers
create table if not exists public.workers (
  id uuid primary key default gen_random_uuid(),
  worker_code text not null unique,
  full_name text not null,
  gender text not null check (gender in ('Female', 'Male', 'Other')),
  date_of_birth date not null,
  phone_number text not null,
  alternative_phone_number text,
  residential_address text not null,
  district text not null,
  next_of_kin text not null,
  next_of_kin_contact text not null,
  education_level text not null,
  previous_work_experience text not null default '',
  skills text[] not null default '{}',
  expected_salary numeric(12, 0) not null check (expected_salary >= 0),
  registration_date date not null default current_date,
  photograph_url text,
  additional_notes text default '',
  availability text not null default 'Available' check (availability in ('Available', 'Placed', 'Inactive')),
  is_demo boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_workers_full_name on public.workers using gin (to_tsvector('english', full_name));
create index if not exists idx_workers_phone on public.workers (phone_number);
create index if not exists idx_workers_availability on public.workers (availability);
create index if not exists idx_workers_district on public.workers (district);

create trigger trg_workers_updated_at
  before update on public.workers
  for each row execute function public.set_updated_at();

-- 3. Clients (Employers / Households)
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  client_code text not null unique,
  full_name text not null,
  phone_number text not null,
  alternative_phone_number text,
  residential_address text not null,
  preferred_worker_type text not null,
  salary_budget numeric(12, 0) not null check (salary_budget >= 0),
  special_requirements text default '',
  registration_date date not null default current_date,
  additional_notes text default '',
  is_demo boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_clients_full_name on public.clients using gin (to_tsvector('english', full_name));
create index if not exists idx_clients_phone on public.clients (phone_number);

create trigger trg_clients_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- 4. Job Applications
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  application_code text not null unique,
  worker_id uuid not null references public.workers(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  work_type text not null,
  application_date date not null default current_date,
  status text not null default 'Pending' check (status in ('Pending', 'Under Review', 'Approved', 'Rejected', 'Placed')),
  notes text default '',
  is_demo boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_applications_worker on public.applications (worker_id);
create index if not exists idx_applications_client on public.applications (client_id);
create index if not exists idx_applications_status on public.applications (status);

create trigger trg_applications_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

-- 5. Placements & Probation Tracking
create table if not exists public.placements (
  id uuid primary key default gen_random_uuid(),
  placement_code text not null unique,
  worker_id uuid not null references public.workers(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  job_description text not null,
  agreed_salary numeric(12, 0) not null check (agreed_salary >= 0),
  placement_date date not null default current_date,
  probation_duration_days integer not null check (probation_duration_days >= 0),
  probation_end_date date not null,
  status text not null default 'Active' check (status in ('Active', 'Completed', 'Terminated')),
  additional_notes text default '',
  is_demo boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enforce that a worker cannot have multiple simultaneous Active placements
create unique index if not exists idx_placements_one_active_per_worker
  on public.placements (worker_id)
  where status = 'Active';

create index if not exists idx_placements_client on public.placements (client_id);
create index if not exists idx_placements_status on public.placements (status);
create index if not exists idx_placements_probation_end on public.placements (probation_end_date);

create trigger trg_placements_updated_at
  before update on public.placements
  for each row execute function public.set_updated_at();

-- 6. Payments (UGX Ledger)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  payment_reference text not null unique,
  client_id uuid not null references public.clients(id) on delete restrict,
  worker_id uuid references public.workers(id) on delete set null,
  placement_id uuid references public.placements(id) on delete set null,
  amount_ugx numeric(12, 0) not null check (amount_ugx > 0),
  payment_date date not null default current_date,
  payment_method text not null check (payment_method in ('Cash', 'Mobile Money', 'Bank Transfer')),
  description text not null default '',
  status text not null default 'Paid' check (status in ('Paid', 'Pending')),
  is_demo boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payments_client on public.payments (client_id);
create index if not exists idx_payments_worker on public.payments (worker_id);
create index if not exists idx_payments_placement on public.payments (placement_id);
create index if not exists idx_payments_status on public.payments (status);

create trigger trg_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.workers enable row level security;
alter table public.clients enable row level security;
alter table public.applications enable row level security;
alter table public.placements enable row level security;
alter table public.payments enable row level security;

-- Helper function checking authenticated agency staff membership
create or replace function public.is_agency_staff()
returns boolean
language sql
stable
security definer
as $$
  select auth.uid() is not null
    and exists (
      select 1 from public.profiles p where p.id = auth.uid()
    );
$$;

-- Profiles policies
create policy "Agency staff can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Agency staff can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Agency operational records policies (authenticated staff only)
create policy "Authorized staff full access to workers"
  on public.workers for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

create policy "Authorized staff full access to clients"
  on public.clients for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

create policy "Authorized staff full access to applications"
  on public.applications for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

create policy "Authorized staff full access to placements"
  on public.placements for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

create policy "Authorized staff full access to payments"
  on public.payments for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

-- Optional Storage Bucket for Worker Photographs
-- insert into storage.buckets (id, name, public) values ('worker-photos', 'worker-photos', true) on conflict do nothing;
