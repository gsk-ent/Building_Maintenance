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
