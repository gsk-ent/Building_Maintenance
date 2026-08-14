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
