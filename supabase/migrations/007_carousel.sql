-- ODYSS3D — Imágenes propias del carrusel del Home (administrables desde /admin/carrusel)

create table if not exists public.carousel_slides (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.carousel_slides enable row level security;

drop policy if exists "carousel_slides_public_read" on public.carousel_slides;
create policy "carousel_slides_public_read" on public.carousel_slides
  for select using (true);

drop policy if exists "carousel_slides_admin_all" on public.carousel_slides;
create policy "carousel_slides_admin_all" on public.carousel_slides
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Bucket público (las imágenes se muestran en el Home sin firmar URLs)
insert into storage.buckets (id, name, public)
values ('carousel', 'carousel', true)
on conflict (id) do update set public = true;

drop policy if exists "carousel_storage_public_read" on storage.objects;
create policy "carousel_storage_public_read" on storage.objects
  for select using (bucket_id = 'carousel');

drop policy if exists "carousel_storage_admin_all" on storage.objects;
create policy "carousel_storage_admin_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'carousel' and public.is_admin())
  with check (bucket_id = 'carousel' and public.is_admin());
