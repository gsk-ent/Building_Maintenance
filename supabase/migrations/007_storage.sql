-- 007: Private storage bucket for maintenance documents/photos.

insert into storage.buckets (id, name, public)
values ('maintenance-files', 'maintenance-files', false)
on conflict (id) do nothing;

-- Path convention: <property_id>/<request_id>/<filename>
create policy "storage: authenticated upload"
  on storage.objects for insert
  with check (
    bucket_id = 'maintenance-files'
    and auth.uid() is not null
  );

create policy "storage: read if property visible"
  on storage.objects for select
  using (
    bucket_id = 'maintenance-files'
    and (
      public.is_manager()
      or public.is_assigned_to_property(((storage.foldername(name))[1])::uuid)
    )
  );

create policy "storage: owner delete"
  on storage.objects for delete
  using (bucket_id = 'maintenance-files' and owner = auth.uid());
