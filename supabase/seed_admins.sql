-- Seed the five Talent Bridge Agency Administrators into Supabase Auth & public.profiles
-- Run this in the Supabase SQL Editor after running supabase/schema.sql.

create extension if not exists "pgcrypto";

do $$
declare
  admin_rec record;
  new_uid uuid;
begin
  for admin_rec in
    select * from (values
      ('Calvin Kibirige', 'calvin.kibirige@talentbridge.ug'),
      ('Lynn Kageye', 'lynn.kageye@talentbridge.ug'),
      ('Ngabo Mark', 'ngabo.mark@talentbridge.ug'),
      ('Donnan Kemigisa', 'donnan.kemigisa@talentbridge.ug'),
      ('Louis Kimera', 'louis.kimera@talentbridge.ug')
    ) as t(full_name, email)
  loop
    select id into new_uid from auth.users where email = admin_rec.email;

    if new_uid is null then
      new_uid := gen_random_uuid();
      insert into auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change
      ) values (
        '00000000-0000-0000-0000-000000000000',
        new_uid,
        'authenticated',
        'authenticated',
        admin_rec.email,
        crypt('Trojans@2026', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', admin_rec.full_name),
        now(),
        now(),
        '',
        '',
        '',
        ''
      );
    end if;

    insert into public.profiles (id, email, full_name, role_title, agency_name, agency_location)
    values (
      new_uid,
      admin_rec.email,
      admin_rec.full_name,
      'Agency Administrator',
      'Talent Bridge Recruitment Agency',
      'Ntinda, Kampala, Uganda'
    )
    on conflict (id) do update
      set full_name = excluded.full_name,
          role_title = excluded.role_title;
  end loop;
end $$;
