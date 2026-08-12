-- Development seed data. DEMO ONLY — never run against production.
-- Users must be created through Supabase Auth (dashboard or signup flow);
-- this seed only creates business data and expects you to grant roles
-- to your own test users afterwards, e.g.:
--   insert into public.user_roles (user_id, role)
--   values ('<auth-user-uuid>', 'admin');

insert into public.maintenance_categories (name, description) values
  ('Plumbing', 'Leaks, blockages, water supply'),
  ('Electrical', 'Wiring, lighting, power failures'),
  ('Lift / Elevator', 'Lift maintenance and breakdowns'),
  ('Cleaning', 'Common area cleaning and waste'),
  ('Security', 'Watchmen, locks, CCTV'),
  ('General', 'Anything else')
on conflict (name) do nothing;

insert into public.properties (id, name, address_line1, city, country, notes) values
  ('11111111-1111-1111-1111-111111111111',
   'Thripura Sadan', 'Demo Street 1', 'Hyderabad', 'India',
   'DEMO PROPERTY — seed data')
on conflict (id) do nothing;

insert into public.buildings (id, property_id, name, floors_count) values
  ('22222222-2222-2222-2222-222222222222',
   '11111111-1111-1111-1111-111111111111', 'Main Block', 5)
on conflict (id) do nothing;

insert into public.units (building_id, unit_number, floor)
select '22222222-2222-2222-2222-222222222222', u, f
from (values
  ('101',1),('102',1),('202',2),('301',3),('302',3),
  ('401',4),('402',4),('501',5),('502',5),('Shop',0)
) as t(u, f)
on conflict (building_id, unit_number) do nothing;

-- Demo finance data for the seeded property.
insert into public.expense_categories (property_id, name) values
  ('11111111-1111-1111-1111-111111111111', 'Watchmen Salary'),
  ('11111111-1111-1111-1111-111111111111', 'Electricity Common'),
  ('11111111-1111-1111-1111-111111111111', 'GHMC Dustbin'),
  ('11111111-1111-1111-1111-111111111111', 'Lift Maintenance'),
  ('11111111-1111-1111-1111-111111111111', 'Miscellaneous')
on conflict (property_id, name) do nothing;
