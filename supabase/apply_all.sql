-- ========== 001_extensions_and_enums.sql ==========
-- 001: Extensions and enum types
create extension if not exists "pgcrypto";

create type public.app_role as enum (
  'admin', 'property_manager', 'maintenance_manager',
  'technician', 'resident', 'vendor'
);

create type public.request_status as enum (
  'open', 'triaged', 'in_progress', 'on_hold',
  'completed', 'closed', 'cancelled'
);

create type public.request_priority as enum ('low', 'medium', 'high', 'urgent');

create type public.work_order_status as enum (
  'draft', 'assigned', 'in_progress', 'completed', 'cancelled'
);

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

-- ========== 002_profiles_and_roles.sql ==========
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

-- ========== 003_properties.sql ==========
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

-- ========== 004_maintenance.sql ==========
-- 004: Maintenance requests, comments, work orders, vendors, categories

create table public.maintenance_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_email text,
  contact_phone text,
  services text,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_vendors_updated_at
  before update on public.vendors
  for each row execute function public.set_updated_at();

create table public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  building_id uuid references public.buildings(id) on delete set null,
  unit_id uuid references public.units(id) on delete set null,
  category_id uuid references public.maintenance_categories(id) on delete set null,
  title text not null check (char_length(title) between 4 and 150),
  description text not null,
  status public.request_status not null default 'open',
  priority public.request_priority not null default 'medium',
  requested_by uuid not null references auth.users(id) on delete cascade,
  assigned_to uuid references auth.users(id) on delete set null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_maintenance_requests_updated_at
  before update on public.maintenance_requests
  for each row execute function public.set_updated_at();

create index idx_mr_property_id on public.maintenance_requests(property_id);
create index idx_mr_status on public.maintenance_requests(status);
create index idx_mr_requested_by on public.maintenance_requests(requested_by);
create index idx_mr_assigned_to on public.maintenance_requests(assigned_to);
create index idx_mr_created_at on public.maintenance_requests(created_at desc);

create table public.maintenance_request_comments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.maintenance_requests(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index idx_mrc_request_id on public.maintenance_request_comments(request_id);

create table public.work_orders (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.maintenance_requests(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  title text not null,
  instructions text,
  status public.work_order_status not null default 'draft',
  assigned_to uuid references auth.users(id) on delete set null,
  vendor_id uuid references public.vendors(id) on delete set null,
  scheduled_for timestamptz,
  completed_at timestamptz,
  cost_estimate numeric(12,2) check (cost_estimate >= 0),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_work_orders_updated_at
  before update on public.work_orders
  for each row execute function public.set_updated_at();

create index idx_wo_request_id on public.work_orders(request_id);
create index idx_wo_property_id on public.work_orders(property_id);
create index idx_wo_assigned_to on public.work_orders(assigned_to);
create index idx_wo_status on public.work_orders(status);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade,
  request_id uuid references public.maintenance_requests(id) on delete cascade,
  work_order_id uuid references public.work_orders(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint check (size_bytes >= 0),
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (property_id is not null or request_id is not null or work_order_id is not null)
);
create index idx_documents_request_id on public.documents(request_id);
create index idx_documents_property_id on public.documents(property_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_notifications_user_id_created
  on public.notifications(user_id, created_at desc);

-- ========== 005_activity_logging.sql ==========
-- 005: Application activity log (append-only) + audit triggers

create table public.user_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  action text not null,
  entity_type text,
  entity_id text,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index idx_activity_user_id on public.user_activity(user_id);
create index idx_activity_action on public.user_activity(action);
create index idx_activity_entity on public.user_activity(entity_type, entity_id);
create index idx_activity_created_at on public.user_activity(created_at desc);

-- Append-only: nobody updates or deletes activity rows through the API.
create or replace function public.prevent_activity_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'user_activity is append-only';
end;
$$;

create trigger trg_activity_no_update
  before update or delete on public.user_activity
  for each row execute function public.prevent_activity_mutation();

-- Database-level audit for critical mutations: even if application code is
-- bypassed, status changes and role changes are always captured.
create or replace function public.audit_request_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.user_activity
      (user_id, action, entity_type, entity_id, description, metadata)
    values (
      auth.uid(),
      'maintenance_request.status_changed',
      'maintenance_request',
      new.id::text,
      format('Status changed from %s to %s', old.status, new.status),
      jsonb_build_object('from', old.status, 'to', new.status,
                         'property_id', new.property_id)
    );
  end if;
  if new.assigned_to is distinct from old.assigned_to then
    insert into public.user_activity
      (user_id, action, entity_type, entity_id, metadata)
    values (
      auth.uid(),
      'maintenance_request.assigned',
      'maintenance_request',
      new.id::text,
      jsonb_build_object('assigned_to', new.assigned_to)
    );
  end if;
  return new;
end;
$$;

create trigger trg_audit_request_changes
  after update on public.maintenance_requests
  for each row execute function public.audit_request_status_change();

create or replace function public.audit_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_activity
    (user_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    case when tg_op = 'INSERT' then 'role.granted' else 'role.revoked' end,
    'user_role',
    coalesce(new.user_id, old.user_id)::text,
    jsonb_build_object('role', coalesce(new.role, old.role))
  );
  return coalesce(new, old);
end;
$$;

create trigger trg_audit_role_changes
  after insert or delete on public.user_roles
  for each row execute function public.audit_role_change();

-- ========== 006_rls_policies.sql ==========
-- 006: Row Level Security — restrictive by default on every table.
-- The publishable/anon key can do NOTHING that these policies do not allow.

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.properties enable row level security;
alter table public.buildings enable row level security;
alter table public.units enable row level security;
alter table public.property_user_assignments enable row level security;
alter table public.maintenance_categories enable row level security;
alter table public.vendors enable row level security;
alter table public.maintenance_requests enable row level security;
alter table public.maintenance_request_comments enable row level security;
alter table public.work_orders enable row level security;
alter table public.documents enable row level security;
alter table public.notifications enable row level security;
alter table public.user_activity enable row level security;

---------------------------------------------------------------- profiles
create policy "profiles: own read" on public.profiles
  for select using (user_id = auth.uid());
create policy "profiles: managers read all" on public.profiles
  for select using (public.is_manager());
create policy "profiles: own update" on public.profiles
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());
-- INSERT/DELETE only via trigger / admin client (no policies).

---------------------------------------------------------------- user_roles
create policy "user_roles: own read" on public.user_roles
  for select using (user_id = auth.uid());
create policy "user_roles: admin read" on public.user_roles
  for select using (public.is_admin());
create policy "user_roles: admin manage" on public.user_roles
  for insert with check (public.is_admin());
create policy "user_roles: admin delete" on public.user_roles
  for delete using (public.is_admin());

---------------------------------------------------------------- properties
create policy "properties: assigned read" on public.properties
  for select using (public.is_manager() or public.is_assigned_to_property(id));
create policy "properties: managers create" on public.properties
  for insert with check (public.is_manager());
create policy "properties: managers update" on public.properties
  for update using (public.manages_property(id) or public.is_manager())
  with check (public.manages_property(id) or public.is_manager());
create policy "properties: admin delete" on public.properties
  for delete using (public.is_admin());

---------------------------------------------------------------- buildings / units
create policy "buildings: visible via property" on public.buildings
  for select using (public.is_manager() or public.is_assigned_to_property(property_id));
create policy "buildings: managers write" on public.buildings
  for insert with check (public.manages_property(property_id) or public.is_manager());
create policy "buildings: managers update" on public.buildings
  for update using (public.manages_property(property_id) or public.is_manager());
create policy "buildings: admin delete" on public.buildings
  for delete using (public.is_admin());

create policy "units: visible via property" on public.units
  for select using (
    public.is_manager() or exists (
      select 1 from public.buildings b
      where b.id = building_id and public.is_assigned_to_property(b.property_id)
    )
  );
create policy "units: managers write" on public.units
  for insert with check (
    exists (
      select 1 from public.buildings b
      where b.id = building_id
        and (public.manages_property(b.property_id) or public.is_manager())
    )
  );
create policy "units: managers update" on public.units
  for update using (
    exists (
      select 1 from public.buildings b
      where b.id = building_id
        and (public.manages_property(b.property_id) or public.is_manager())
    )
  );
create policy "units: admin delete" on public.units
  for delete using (public.is_admin());

---------------------------------------------------------------- assignments
create policy "pua: own read" on public.property_user_assignments
  for select using (user_id = auth.uid());
create policy "pua: managers read" on public.property_user_assignments
  for select using (public.is_manager() or public.manages_property(property_id));
create policy "pua: managers write" on public.property_user_assignments
  for insert with check (public.is_manager() or public.manages_property(property_id));
create policy "pua: managers delete" on public.property_user_assignments
  for delete using (public.is_manager() or public.manages_property(property_id));

---------------------------------------------------------------- categories / vendors
create policy "categories: all authenticated read" on public.maintenance_categories
  for select using (auth.uid() is not null);
create policy "categories: managers write" on public.maintenance_categories
  for insert with check (public.is_manager());
create policy "categories: managers update" on public.maintenance_categories
  for update using (public.is_manager());
create policy "categories: admin delete" on public.maintenance_categories
  for delete using (public.is_admin());

create policy "vendors: managers read" on public.vendors
  for select using (public.is_manager());
create policy "vendors: own read" on public.vendors
  for select using (user_id = auth.uid());
create policy "vendors: managers write" on public.vendors
  for insert with check (public.is_manager());
create policy "vendors: managers update" on public.vendors
  for update using (public.is_manager());
create policy "vendors: admin delete" on public.vendors
  for delete using (public.is_admin());

---------------------------------------------------------------- maintenance requests
-- Read: managers; the requester; the assignee; anyone assigned to the property
-- with a manager/technician relationship. Residents see only their own requests.
create policy "mr: managers read" on public.maintenance_requests
  for select using (public.is_manager());
create policy "mr: requester read" on public.maintenance_requests
  for select using (requested_by = auth.uid());
create policy "mr: assignee read" on public.maintenance_requests
  for select using (assigned_to = auth.uid());
create policy "mr: property staff read" on public.maintenance_requests
  for select using (
    exists (
      select 1 from public.property_user_assignments a
      where a.property_id = maintenance_requests.property_id
        and a.user_id = auth.uid()
        and a.relationship in ('manager','technician')
    )
  );

-- Create: any user assigned to the property (resident/manager/technician), or managers.
create policy "mr: create for own property" on public.maintenance_requests
  for insert with check (
    requested_by = auth.uid()
    and (public.is_manager() or public.is_assigned_to_property(property_id))
  );

-- Update: managers of the property, global managers, or the assignee
-- (technician updating status). Requester may update while still open.
create policy "mr: managers update" on public.maintenance_requests
  for update using (public.is_manager() or public.manages_property(property_id));
create policy "mr: assignee update" on public.maintenance_requests
  for update using (assigned_to = auth.uid());
create policy "mr: requester update while open" on public.maintenance_requests
  for update using (requested_by = auth.uid() and status = 'open');

create policy "mr: admin delete" on public.maintenance_requests
  for delete using (public.is_admin());

---------------------------------------------------------------- comments
create policy "mrc: read if request visible" on public.maintenance_request_comments
  for select using (
    exists (select 1 from public.maintenance_requests r where r.id = request_id)
  );
create policy "mrc: comment if request visible" on public.maintenance_request_comments
  for insert with check (
    author_id = auth.uid()
    and exists (select 1 from public.maintenance_requests r where r.id = request_id)
  );
create policy "mrc: admin delete" on public.maintenance_request_comments
  for delete using (public.is_admin());

---------------------------------------------------------------- work orders
create policy "wo: managers read" on public.work_orders
  for select using (public.is_manager() or public.manages_property(property_id));
create policy "wo: assignee read" on public.work_orders
  for select using (assigned_to = auth.uid());
create policy "wo: vendor read" on public.work_orders
  for select using (
    exists (
      select 1 from public.vendors v
      where v.id = vendor_id and v.user_id = auth.uid()
    )
  );
create policy "wo: managers create" on public.work_orders
  for insert with check (
    created_by = auth.uid()
    and (public.is_manager() or public.manages_property(property_id))
  );
create policy "wo: managers update" on public.work_orders
  for update using (public.is_manager() or public.manages_property(property_id));
create policy "wo: assignee update" on public.work_orders
  for update using (assigned_to = auth.uid());
create policy "wo: admin delete" on public.work_orders
  for delete using (public.is_admin());

---------------------------------------------------------------- documents
create policy "documents: read if parent visible" on public.documents
  for select using (
    public.is_manager()
    or (request_id is not null and exists
        (select 1 from public.maintenance_requests r where r.id = request_id))
    or (property_id is not null and public.is_assigned_to_property(property_id))
  );
create policy "documents: upload own" on public.documents
  for insert with check (uploaded_by = auth.uid());
create policy "documents: uploader delete" on public.documents
  for delete using (uploaded_by = auth.uid() or public.is_admin());

---------------------------------------------------------------- notifications
create policy "notifications: own read" on public.notifications
  for select using (user_id = auth.uid());
create policy "notifications: own update" on public.notifications
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());
-- INSERT via admin client / triggers only.

---------------------------------------------------------------- user_activity
-- Admins read everything; users may read their own trail. Nobody inserts,
-- updates, or deletes via the public API (server admin client + SECURITY
-- DEFINER triggers only).
create policy "activity: admin read" on public.user_activity
  for select using (public.is_admin());
create policy "activity: own read" on public.user_activity
  for select using (user_id = auth.uid());

-- ========== 007_storage.sql ==========
-- 007: Private storage bucket for maintenance documents/photos.

insert into storage.buckets (id, name, public)
values ('maintenance-files', 'maintenance-files', false)
on conflict (id) do nothing;

-- Path convention: <property_id>/<request_id>/<filename>
create policy "storage: authenticated upload"
  on storage.objects for insert
  with check (
    bucket_id = 'maintenance-files'
    and auth.uid() is not null
  );

create policy "storage: read if property visible"
  on storage.objects for select
  using (
    bucket_id = 'maintenance-files'
    and (
      public.is_manager()
      or public.is_assigned_to_property(((storage.foldername(name))[1])::uuid)
    )
  );

create policy "storage: owner delete"
  on storage.objects for delete
  using (bucket_id = 'maintenance-files' and owner = auth.uid());

-- ========== 008_finances.sql ==========
-- 008: Building finances — flat-wise dues, expenses, UPI/bank payment settings.
-- Residents may see only their own unit's dues; expenses and payment settings
-- are manager/admin territory; all writes go through server actions.

alter table public.units
  add column if not exists default_monthly_amount numeric(12,2) check (default_monthly_amount >= 0);

create table public.property_payment_settings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null unique references public.properties(id) on delete cascade,
  upi_id text,
  upi_number text,
  bank_account_name text,
  bank_account_number text,
  bank_ifsc text,
  bank_name text,
  notes text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_payment_settings_updated_at
  before update on public.property_payment_settings
  for each row execute function public.set_updated_at();

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (property_id, name)
);
create index idx_expense_categories_property on public.expense_categories(property_id);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  category_id uuid references public.expense_categories(id) on delete set null,
  period date not null, -- first day of the month this expense belongs to
  amount numeric(12,2) not null check (amount >= 0),
  description text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_expenses_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();
create index idx_expenses_property_period on public.expenses(property_id, period);
create index idx_expenses_category on public.expenses(category_id);

create table public.monthly_dues (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete cascade,
  period date not null, -- first day of the month this due is for
  amount_due numeric(12,2) not null default 0 check (amount_due >= 0),
  amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0),
  paid_at timestamptz,
  payment_method text,
  notes text,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (unit_id, period)
);
create trigger trg_monthly_dues_updated_at
  before update on public.monthly_dues
  for each row execute function public.set_updated_at();
create index idx_monthly_dues_property on public.monthly_dues(property_id);
create index idx_monthly_dues_unit on public.monthly_dues(unit_id);
create index idx_monthly_dues_period on public.monthly_dues(period);

-- Does the current user reside in the given unit?
create or replace function public.resides_in_unit(uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.property_user_assignments
    where unit_id = uid and user_id = auth.uid() and relationship = 'resident'
  );
$$;

alter table public.property_payment_settings enable row level security;
alter table public.expense_categories enable row level security;
alter table public.expenses enable row level security;
alter table public.monthly_dues enable row level security;

---------------------------------------------------------------- payment settings
-- Anyone assigned to the property can view how to pay; only managers edit.
create policy "payment_settings: assigned read" on public.property_payment_settings
  for select using (public.is_manager() or public.is_assigned_to_property(property_id));
create policy "payment_settings: managers upsert" on public.property_payment_settings
  for insert with check (public.manages_property(property_id) or public.is_manager());
create policy "payment_settings: managers update" on public.property_payment_settings
  for update using (public.manages_property(property_id) or public.is_manager());
create policy "payment_settings: admin delete" on public.property_payment_settings
  for delete using (public.is_admin());

---------------------------------------------------------------- expense categories
create policy "expense_categories: managers read" on public.expense_categories
  for select using (public.is_manager() or public.manages_property(property_id));
create policy "expense_categories: managers write" on public.expense_categories
  for insert with check (public.manages_property(property_id) or public.is_manager());
create policy "expense_categories: managers update" on public.expense_categories
  for update using (public.manages_property(property_id) or public.is_manager());
create policy "expense_categories: admin delete" on public.expense_categories
  for delete using (public.is_admin());

---------------------------------------------------------------- expenses
-- Building expenses are manager/admin visibility only — residents do not
-- see the expense ledger, per the access model.
create policy "expenses: managers read" on public.expenses
  for select using (public.is_manager() or public.manages_property(property_id));
create policy "expenses: managers write" on public.expenses
  for insert with check (
    created_by = auth.uid()
    and (public.manages_property(property_id) or public.is_manager())
  );
create policy "expenses: managers update" on public.expenses
  for update using (public.manages_property(property_id) or public.is_manager());
create policy "expenses: admin delete" on public.expenses
  for delete using (public.is_admin());

---------------------------------------------------------------- monthly dues
-- Residents see ONLY the dues for the unit(s) they live in. Managers see
-- everything on properties they manage. Only managers/admins write.
create policy "dues: own unit read" on public.monthly_dues
  for select using (public.resides_in_unit(unit_id));
create policy "dues: managers read" on public.monthly_dues
  for select using (public.is_manager() or public.manages_property(property_id));
create policy "dues: managers write" on public.monthly_dues
  for insert with check (public.manages_property(property_id) or public.is_manager());
create policy "dues: managers update" on public.monthly_dues
  for update using (public.manages_property(property_id) or public.is_manager());
create policy "dues: admin delete" on public.monthly_dues
  for delete using (public.is_admin());

-- Audit due-payment changes the same way request status changes are audited.
create or replace function public.audit_due_payment_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.amount_paid is distinct from old.amount_paid then
    insert into public.user_activity
      (user_id, action, entity_type, entity_id, description, metadata)
    values (
      auth.uid(),
      'dues.payment_recorded',
      'monthly_due',
      new.id::text,
      format('Payment updated for unit %s, period %s', new.unit_id, new.period),
      jsonb_build_object(
        'unit_id', new.unit_id, 'property_id', new.property_id,
        'period', new.period, 'amount_due', new.amount_due,
        'amount_paid', new.amount_paid
      )
    );
  end if;
  return new;
end;
$$;

create trigger trg_audit_due_payment
  after update on public.monthly_dues
  for each row execute function public.audit_due_payment_change();

create or replace function public.audit_due_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_activity
    (user_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(), 'dues.generated', 'monthly_due', new.id::text,
    jsonb_build_object('unit_id', new.unit_id, 'property_id', new.property_id, 'period', new.period)
  );
  return new;
end;
$$;

create trigger trg_audit_due_created
  after insert on public.monthly_dues
  for each row execute function public.audit_due_created();

-- ========== 009_expense_transparency.sql ==========
-- 009: Expense transparency — every member assigned to a property (not just
-- managers) can read its expense ledger, so residents see exactly what
-- their dues fund. Writes remain manager/admin only (unchanged from 008).

create policy "expenses: assigned read" on public.expenses
  for select using (public.is_assigned_to_property(property_id));

create policy "expense_categories: assigned read" on public.expense_categories
  for select using (public.is_assigned_to_property(property_id));

-- ========== 010_resident_unit_cap.sql ==========
-- 010: Cap residents per unit at 2. Enforced in the database (not just the
-- app) so it holds no matter how the row is inserted or updated.

create or replace function public.enforce_resident_unit_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resident_count integer;
begin
  if new.relationship = 'resident' and new.unit_id is not null then
    select count(*) into resident_count
    from public.property_user_assignments
    where unit_id = new.unit_id
      and relationship = 'resident'
      and id is distinct from new.id;

    if resident_count >= 2 then
      raise exception 'UNIT_RESIDENT_LIMIT: this unit already has the maximum of 2 residents'
        using errcode = '23514'; -- check_violation, so callers can detect it consistently
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_enforce_resident_unit_cap
  before insert or update on public.property_user_assignments
  for each row execute function public.enforce_resident_unit_cap();

-- ========== 011_property_admins.sql ==========
-- 011: Per-building admins. A property can have its own "admin" members
-- (distinct from the platform-wide `admin` role) who manage that building
-- and can grant admin access to other members of the same building. Every
-- building always keeps at least one admin.

-- Allow 'admin' as a relationship value.
do $$
declare
  conname text;
begin
  select con.conname into conname
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'property_user_assignments'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%relationship%';
  if conname is not null then
    execute format('alter table public.property_user_assignments drop constraint %I', conname);
  end if;
end $$;

alter table public.property_user_assignments
  add constraint property_user_assignments_relationship_check
  check (relationship in ('admin', 'manager', 'resident', 'technician', 'vendor'));

-- Is the current user an admin of this specific building (or a platform admin)?
create or replace function public.is_property_admin(pid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.property_user_assignments
    where property_id = pid and user_id = auth.uid() and relationship = 'admin'
  );
$$;

-- Building admins get the same management rights as 'manager' everywhere
-- manages_property() is already used, with no other RLS policy changes needed.
create or replace function public.manages_property(pid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.property_user_assignments
    where property_id = pid and user_id = auth.uid()
      and relationship in ('manager', 'admin')
  );
$$;

-- Guardrails around the 'admin' relationship itself:
--  1. Only an existing building admin (or platform admin) may grant/revoke
--     admin access for that building — a plain 'manager' cannot. The one
--     exception is bootstrapping: the property's very first admin can be
--     self-assigned by whoever creates the property (there is nobody else
--     to grant it yet).
--  2. A building must always keep at least one admin — the last admin
--     cannot be demoted or removed.
--  3. Checks only apply inside authenticated user sessions (auth.uid() is
--     set); direct SQL by the project owner (service role / SQL editor,
--     where auth.uid() is null) is trusted and unaffected — this also lets
--     this migration's own backfill below run cleanly.
create or replace function public.enforce_admin_relationship_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  touches_admin boolean;
  authorized boolean;
  target_property uuid;
begin
  target_property := coalesce(new.property_id, old.property_id);

  touches_admin := (
    (tg_op = 'INSERT' and new.relationship = 'admin') or
    (tg_op = 'UPDATE' and (new.relationship = 'admin' or old.relationship = 'admin')) or
    (tg_op = 'DELETE' and old.relationship = 'admin')
  );

  if touches_admin and auth.uid() is not null then
    authorized := public.is_admin() or public.is_property_admin(target_property);

    -- Bootstrap: a brand-new building with no admin yet may be self-assigned
    -- by whoever is creating this very row for themselves.
    if not authorized and tg_op = 'INSERT' and new.user_id = auth.uid() then
      authorized := not exists (
        select 1 from public.property_user_assignments
        where property_id = new.property_id and relationship = 'admin'
      );
    end if;

    if not authorized then
      raise exception 'ADMIN_GRANT_FORBIDDEN: only an existing building admin can grant or change admin access'
        using errcode = '23514';
    end if;
  end if;

  if tg_op in ('UPDATE', 'DELETE') and old.relationship = 'admin'
     and (tg_op = 'DELETE' or new.relationship is distinct from 'admin') then
    if (
      select count(*) from public.property_user_assignments
      where property_id = old.property_id and relationship = 'admin'
        and id is distinct from old.id
    ) = 0 then
      raise exception 'LAST_ADMIN_REQUIRED: every building must keep at least one admin'
        using errcode = '23514';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger trg_enforce_admin_relationship_change
  before insert or update or delete on public.property_user_assignments
  for each row execute function public.enforce_admin_relationship_change();

-- Allow updates to this table (e.g. changing someone's relationship) —
-- previously only insert/select/delete were possible via the API.
create policy "pua: managers update" on public.property_user_assignments
  for update using (public.manages_property(property_id) or public.is_manager());

-- Backfill: every property created before this migration gets an admin —
-- promote its earliest 'manager' assignment, or fall back to its creator.
do $$
declare
  r record;
begin
  for r in
    select p.id as property_id, p.created_by
    from public.properties p
    where not exists (
      select 1 from public.property_user_assignments a
      where a.property_id = p.id and a.relationship = 'admin'
    )
  loop
    if exists (
      select 1 from public.property_user_assignments
      where property_id = r.property_id and relationship = 'manager'
    ) then
      update public.property_user_assignments
      set relationship = 'admin'
      where id = (
        select id from public.property_user_assignments
        where property_id = r.property_id and relationship = 'manager'
        order by created_at asc
        limit 1
      );
    elsif r.created_by is not null then
      insert into public.property_user_assignments (property_id, user_id, relationship)
      values (r.property_id, r.created_by, 'admin')
      on conflict (property_id, user_id, relationship) do nothing;
    end if;
  end loop;
end $$;

