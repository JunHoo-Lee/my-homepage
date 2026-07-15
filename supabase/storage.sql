-- Create the 'uploads' bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;

-- Set up security policy to allow public access (viewing) of images
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'uploads' );

-- Set up security policy to allow authenticated uploads to 'uploads' bucket
create policy "Authenticated Uploads"
  on storage.objects for insert
  with check ( bucket_id = 'uploads' );
