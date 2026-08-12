-- 002: Profiles, roles, and automatic profile creation

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null,
  phone text,
  avatar_url text,
  status text not null default 'active' check (status in ('active','suspended')),
  last_login_at timestamptz,
  login_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create index idx_user_roles_user_id on public.user_roles(user_id);

-- Automatic profile creation on signup (server-side, cannot be skipped by
-- the frontend). SECURITY DEFINER so it can insert despite RLS.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (user_id) do update
    set email = excluded.email,
        full_name = case when public.profiles.full_name = '' then excluded.full_name
                         else public.profiles.full_name end;

  -- Default role for self-registered users
  insert into public.user_roles (user_id, role)
  values (new.id, 'resident')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Authorization helper functions (used by RLS policies).
-- SECURITY DEFINER + STABLE so policies can call them without recursive RLS.
create or replace function public.has_role(check_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = check_role
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select public.has_role('admin'); $$;

create or replace function public.is_manager()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.has_role('admin')
      or public.has_role('property_manager')
      or public.has_role('maintenance_manager');
$$;
