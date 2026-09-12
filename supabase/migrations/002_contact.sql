-- ============================================================
-- ODYSS3D — Cotizaciones públicas (formulario + adjuntos)
-- ============================================================

-- ---------- contact_requests ----------
create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null,
  message text,
  file_paths text[] not null default '{}',
  status text not null default 'nuevo' check (status in ('nuevo', 'respondido', 'cerrado')),
  created_at timestamptz not null default now()
);

alter table public.contact_requests enable row level security;

-- Solo los admins del panel pueden leer/actualizar las solicitudes.
drop policy if exists "contact_requests_admin_all" on public.contact_requests;
create policy "contact_requests_admin_all" on public.contact_requests
  for select to authenticated
  using (public.is_admin());

drop policy if exists "contact_requests_admin_update" on public.contact_requests;
create policy "contact_requests_admin_update" on public.contact_requests
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- storage: bucket privado de adjuntos ----------
insert into storage.buckets (id, name, public)
values ('cotizaciones', 'cotizaciones', false)
on conflict (id) do nothing;

drop policy if exists "cotizaciones_storage_admin_all" on storage.objects;
create policy "cotizaciones_storage_admin_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'cotizaciones' and public.is_admin())
  with check (bucket_id = 'cotizaciones' and public.is_admin());