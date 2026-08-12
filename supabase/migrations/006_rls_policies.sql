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
