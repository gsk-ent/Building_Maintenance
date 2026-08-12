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
