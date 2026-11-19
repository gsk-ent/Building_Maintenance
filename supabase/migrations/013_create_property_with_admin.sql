-- 013: Atomic property creation — property + first admin in one call.
--
-- Previously createProperty did two separate writes from the app: insert
-- the property, then insert the creator as its first 'admin' assignment,
-- with no error check on the second insert. If that insert failed
-- (RLS / trigger), the property existed with ZERO admins, contradicting
-- the "every building always has at least one admin" invariant — and the
-- last-admin trigger only blocks demoting/deleting the last admin, it
-- cannot conjure one that was never created.
--
-- This SECURITY DEFINER function does both inserts in a single
-- transaction: either the property exists with its creator as admin, or
-- nothing is written at all. It enforces the same gate as the old
-- INSERT policy (public.is_manager()) inside the function, because
-- SECURITY DEFINER bypasses RLS.

create or replace function public.create_property_with_admin(
  p_name text,
  p_address_line1 text,
  p_address_line2 text,
  p_city text,
  p_state text,
  p_postal_code text,
  p_country text,
  p_notes text
)
returns table (id uuid, name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_property_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if not public.is_manager() then
    raise exception 'FORBIDDEN: only managers or admins can create properties';
  end if;

  insert into public.properties
    (name, address_line1, address_line2, city, state, postal_code, country, notes, created_by)
  values
    (p_name, p_address_line1, p_address_line2, p_city, p_state, p_postal_code, p_country, p_notes, v_user_id)
  returning properties.id into v_property_id;

  insert into public.property_user_assignments (property_id, user_id, relationship)
  values (v_property_id, v_user_id, 'admin');

  return query select v_property_id, p_name;
end;
$$;
