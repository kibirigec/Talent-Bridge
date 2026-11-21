-- Talent Bridge Public Intake & Job Application Portal Migration
-- Run this in your Supabase SQL Editor to enable safe public applications,
-- client worker requests, anonymized open job listings, and status checks
-- without exposing private worker/client records via RLS.

-- 1. Allow general worker applications not yet assigned to a specific client
alter table public.applications
  alter column client_id drop not null;

-- 2. Public anonymized open job requests (no client names or phone numbers exposed)
create or replace function public.get_public_open_requests()
returns table (
  id uuid,
  client_code text,
  preferred_worker_type text,
  area_summary text,
  salary_budget numeric,
  special_requirements text,
  registration_date date
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.client_code,
    c.preferred_worker_type,
    coalesce(nullif(split_part(c.residential_address, ',', 2), ''), 'Kampala / Wakiso') as area_summary,
    c.salary_budget,
    coalesce(c.special_requirements, '') as special_requirements,
    c.registration_date
  from public.clients c
  order by c.created_at desc
  limit 12;
$$;

-- 3. Public worker self-registration & job application submission
create or replace function public.submit_public_worker_application(
  p_full_name text,
  p_gender text,
  p_date_of_birth date,
  p_phone_number text,
  p_alternative_phone text,
  p_residential_address text,
  p_district text,
  p_next_of_kin text,
  p_next_of_kin_contact text,
  p_education_level text,
  p_previous_experience text,
  p_skills text[],
  p_expected_salary numeric,
  p_work_type text,
  p_client_id uuid default null,
  p_notes text default ''
)
returns table (
  worker_code text,
  application_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker_id uuid := gen_random_uuid();
  v_app_id uuid := gen_random_uuid();
  v_suffix text := lpad(((floor(random() * 9000) + 1000)::int)::text, 4, '0');
  v_worker_code text := 'TB-W-' || v_suffix;
  v_app_code text := 'TB-APP-' || v_suffix;
begin
  -- Ensure uniqueness if collision occurs
  while exists (select 1 from public.workers w where w.worker_code = v_worker_code) loop
    v_suffix := lpad(((floor(random() * 9000) + 1000)::int)::text, 4, '0');
    v_worker_code := 'TB-W-' || v_suffix;
  end loop;

  while exists (select 1 from public.applications a where a.application_code = v_app_code) loop
    v_suffix := lpad(((floor(random() * 9000) + 1000)::int)::text, 4, '0');
    v_app_code := 'TB-APP-' || v_suffix;
  end loop;

  insert into public.workers (
    id,
    worker_code,
    full_name,
    gender,
    date_of_birth,
    phone_number,
    alternative_phone_number,
    residential_address,
    district,
    next_of_kin,
    next_of_kin_contact,
    education_level,
    previous_work_experience,
    skills,
    expected_salary,
    registration_date,
    additional_notes,
    availability,
    is_demo
  ) values (
    v_worker_id,
    v_worker_code,
    trim(p_full_name),
    p_gender,
    p_date_of_birth,
    trim(p_phone_number),
    coalesce(trim(p_alternative_phone), ''),
    trim(p_residential_address),
    trim(p_district),
    trim(p_next_of_kin),
    trim(p_next_of_kin_contact),
    trim(p_education_level),
    coalesce(trim(p_previous_experience), ''),
    coalesce(p_skills, '{}'),
    greatest(0, p_expected_salary),
    current_date,
    coalesce(trim(p_notes), ''),
    'Available',
    false
  );

  insert into public.applications (
    id,
    application_code,
    worker_id,
    client_id,
    work_type,
    application_date,
    status,
    notes,
    is_demo
  ) values (
    v_app_id,
    v_app_code,
    v_worker_id,
    p_client_id,
    trim(p_work_type),
    current_date,
    'Pending',
    coalesce(trim(p_notes), 'Submitted via public online portal.'),
    false
  );

  return query select v_worker_code, v_app_code;
end;
$$;

-- 4. Public client request submission (households/employers requesting a domestic worker)
create or replace function public.submit_public_client_request(
  p_full_name text,
  p_phone_number text,
  p_alternative_phone text,
  p_residential_address text,
  p_preferred_worker_type text,
  p_salary_budget numeric,
  p_special_requirements text default '',
  p_additional_notes text default ''
)
returns table (
  client_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid := gen_random_uuid();
  v_suffix text := lpad(((floor(random() * 9000) + 1000)::int)::text, 4, '0');
  v_client_code text := 'TB-C-' || v_suffix;
begin
  while exists (select 1 from public.clients c where c.client_code = v_client_code) loop
    v_suffix := lpad(((floor(random() * 9000) + 1000)::int)::text, 4, '0');
    v_client_code := 'TB-C-' || v_suffix;
  end loop;

  insert into public.clients (
    id,
    client_code,
    full_name,
    phone_number,
    alternative_phone_number,
    residential_address,
    preferred_worker_type,
    salary_budget,
    special_requirements,
    registration_date,
    additional_notes,
    is_demo
  ) values (
    v_client_id,
    v_client_code,
    trim(p_full_name),
    trim(p_phone_number),
    coalesce(trim(p_alternative_phone), ''),
    trim(p_residential_address),
    trim(p_preferred_worker_type),
    greatest(0, p_salary_budget),
    coalesce(trim(p_special_requirements), ''),
    current_date,
    coalesce(trim(p_additional_notes), 'Submitted via public client request form.'),
    false
  );

  return query select v_client_code;
end;
$$;

-- 5. Public application status lookup (requires matching application code + worker phone digits)
create or replace function public.check_public_application_status(
  p_application_code text,
  p_phone_number text
)
returns table (
  application_code text,
  worker_name text,
  work_type text,
  application_date date,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.application_code,
    w.full_name as worker_name,
    a.work_type,
    a.application_date,
    a.status
  from public.applications a
  join public.workers w on w.id = a.worker_id
  where upper(trim(a.application_code)) = upper(trim(p_application_code))
    and regexp_replace(w.phone_number, '\D', '', 'g') like '%' || right(regexp_replace(p_phone_number, '\D', '', 'g'), 9)
    and length(regexp_replace(p_phone_number, '\D', '', 'g')) >= 9
  limit 1;
$$;

-- Grant execute permissions to anon & authenticated roles
grant execute on function public.get_public_open_requests() to anon, authenticated;
grant execute on function public.submit_public_worker_application(text, text, date, text, text, text, text, text, text, text, text, text[], numeric, text, uuid, text) to anon, authenticated;
grant execute on function public.submit_public_client_request(text, text, text, text, text, numeric, text, text) to anon, authenticated;
grant execute on function public.check_public_application_status(text, text) to anon, authenticated;
