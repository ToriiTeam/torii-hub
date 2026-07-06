alter table public.client_csb
  add column if not exists csl_content text;

insert into storage.buckets (id, name, public)
values ('client-documents', 'client-documents', false)
on conflict (id) do nothing;

create policy "client-documents authenticated all"
on storage.objects for all
to authenticated
using (bucket_id = 'client-documents')
with check (bucket_id = 'client-documents');
