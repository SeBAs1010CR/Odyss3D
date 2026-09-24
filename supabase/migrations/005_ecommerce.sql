-- ============================================================
-- ODYSS3D — Ecommerce (tienda online)
-- Ejecutar en el SQL Editor de Supabase (o con la CLI).
-- Agrega el flag de "publicado en tienda" y los colores por producto.
-- ============================================================

alter table public.products add column if not exists is_ecommerce boolean not null default false;
alter table public.products add column if not exists colors text[] not null default '{}';

-- los productos existentes se publican en la tienda por defecto
update public.products set is_ecommerce = true where is_ecommerce = false;

create index if not exists idx_products_is_ecommerce on public.products (is_ecommerce);