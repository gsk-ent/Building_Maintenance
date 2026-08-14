-- 009: Expense transparency — every member assigned to a property (not just
-- managers) can read its expense ledger, so residents see exactly what
-- their dues fund. Writes remain manager/admin only (unchanged from 008).

create policy "expenses: assigned read" on public.expenses
  for select using (public.is_assigned_to_property(property_id));

create policy "expense_categories: assigned read" on public.expense_categories
  for select using (public.is_assigned_to_property(property_id));
