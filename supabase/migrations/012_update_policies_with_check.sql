-- 012: Add WITH CHECK to every UPDATE policy that only had USING.
--
-- Without WITH CHECK, a user who satisfies USING on the *old* row may
-- write arbitrary values into the *new* row: a technician assigned to a
-- request could re-point its property_id / requested_by / title /
-- priority, a manager updating dues could re-point unit_id /
-- property_id, and so on. WITH CHECK constrains the new row with the
-- same predicate, so an update can only succeed if the resulting row
-- would still be visible/writable to that user.
--
-- One deliberate consequence: the requester policy mirrors its USING
-- verbatim, including `status = 'open'` — so a requester may edit their
-- own request's content while it is open, but may NOT change its status
-- (or re-point it) through that policy. Status changes by requesters
-- were never an app flow; managers and assignees have their own
-- policies for status transitions.
--
-- Existing policies are dropped and recreated with the same names, in
-- the same transaction, so there is no window without a policy.

---------------------------------------------------------------- buildings (006)
drop policy if exists "buildings: managers update" on public.buildings;
create policy "buildings: managers update" on public.buildings
  for update using (public.manages_property(property_id) or public.is_manager())
  with check (public.manages_property(property_id) or public.is_manager());

---------------------------------------------------------------- units (006)
drop policy if exists "units: managers update" on public.units;
create policy "units: managers update" on public.units
  for update using (
    exists (
      select 1 from public.buildings b
      where b.id = building_id
        and (public.manages_property(b.property_id) or public.is_manager())
    )
  )
  with check (
    exists (
      select 1 from public.buildings b
      where b.id = building_id
        and (public.manages_property(b.property_id) or public.is_manager())
    )
  );

---------------------------------------------------------------- categories / vendors (006)
drop policy if exists "categories: managers update" on public.maintenance_categories;
create policy "categories: managers update" on public.maintenance_categories
  for update using (public.is_manager())
  with check (public.is_manager());

drop policy if exists "vendors: managers update" on public.vendors;
create policy "vendors: managers update" on public.vendors
  for update using (public.is_manager())
  with check (public.is_manager());

---------------------------------------------------------------- maintenance requests (006)
drop policy if exists "mr: managers update" on public.maintenance_requests;
create policy "mr: managers update" on public.maintenance_requests
  for update using (public.is_manager() or public.manages_property(property_id))
  with check (public.is_manager() or public.manages_property(property_id));

drop policy if exists "mr: assignee update" on public.maintenance_requests;
create policy "mr: assignee update" on public.maintenance_requests
  for update using (assigned_to = auth.uid())
  with check (assigned_to = auth.uid());

drop policy if exists "mr: requester update while open" on public.maintenance_requests;
create policy "mr: requester update while open" on public.maintenance_requests
  for update using (requested_by = auth.uid() and status = 'open')
  with check (requested_by = auth.uid() and status = 'open');

---------------------------------------------------------------- work orders (006)
drop policy if exists "wo: managers update" on public.work_orders;
create policy "wo: managers update" on public.work_orders
  for update using (public.is_manager() or public.manages_property(property_id))
  with check (public.is_manager() or public.manages_property(property_id));

drop policy if exists "wo: assignee update" on public.work_orders;
create policy "wo: assignee update" on public.work_orders
  for update using (assigned_to = auth.uid())
  with check (assigned_to = auth.uid());

---------------------------------------------------------------- payment settings (008)
drop policy if exists "payment_settings: managers update" on public.property_payment_settings;
create policy "payment_settings: managers update" on public.property_payment_settings
  for update using (public.manages_property(property_id) or public.is_manager())
  with check (public.manages_property(property_id) or public.is_manager());

---------------------------------------------------------------- expense categories (008)
drop policy if exists "expense_categories: managers update" on public.expense_categories;
create policy "expense_categories: managers update" on public.expense_categories
  for update using (public.manages_property(property_id) or public.is_manager())
  with check (public.manages_property(property_id) or public.is_manager());

---------------------------------------------------------------- expenses (008)
drop policy if exists "expenses: managers update" on public.expenses;
create policy "expenses: managers update" on public.expenses
  for update using (public.manages_property(property_id) or public.is_manager())
  with check (public.manages_property(property_id) or public.is_manager());

---------------------------------------------------------------- monthly dues (008)
drop policy if exists "dues: managers update" on public.monthly_dues;
create policy "dues: managers update" on public.monthly_dues
  for update using (public.manages_property(property_id) or public.is_manager())
  with check (public.manages_property(property_id) or public.is_manager());

---------------------------------------------------------------- assignments (011)
drop policy if exists "pua: managers update" on public.property_user_assignments;
create policy "pua: managers update" on public.property_user_assignments
  for update using (public.manages_property(property_id) or public.is_manager())
  with check (public.manages_property(property_id) or public.is_manager());
