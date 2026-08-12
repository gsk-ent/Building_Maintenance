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
