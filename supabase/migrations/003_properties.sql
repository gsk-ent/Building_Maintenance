-- 003: Properties, buildings, units, user-property assignments

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text,
  postal_code text,
  country text not null default 'India',
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_properties_updated_at
  before update on public.properties
  for each row execute function public.set_updated_at();

create table public.buildings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null,
  floors_count integer check (floors_count >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, name)
);
create trigger trg_buildings_updated_at
  before update on public.buildings
  for each row execute function public.set_updated_at();
create index idx_buildings_property_id on public.buildings(property_id);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  unit_number text not null,
  floor integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (building_id, unit_number)
);
create trigger trg_units_updated_at
  before update on public.units
  for each row execute function public.set_updated_at();
create index idx_units_building_id on public.units(building_id);

create table public.property_user_assignments (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  relationship text not null check (relationship in ('manager','resident','technician','vendor')),
  unit_id uuid references public.units(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (property_id, user_id, relationship)
);
create index idx_pua_user_id on public.property_user_assignments(user_id);
create index idx_pua_property_id on public.property_user_assignments(property_id);

-- Is the current user associated with the given property?
create or replace function public.is_assigned_to_property(pid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.property_user_assignments
    where property_id = pid and user_id = auth.uid()
  );
$$;

-- Does the current user manage the given property?
create or replace function public.manages_property(pid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.property_user_assignments
    where property_id = pid and user_id = auth.uid()
      and relationship = 'manager'
  );
$$;
