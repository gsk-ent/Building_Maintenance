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
