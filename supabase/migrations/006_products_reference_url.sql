-- Añadir enlace de referencia interno (MakerWorld, etc.) a productos
alter table if exists public.products
  add column if not exists reference_url text;

comment on column public.products.reference_url is 'Enlace de referencia interno (p.ej. MakerWorld) para uso en admin.';