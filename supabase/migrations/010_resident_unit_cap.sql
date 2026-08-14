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
