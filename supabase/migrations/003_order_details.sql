-- ============================================================
-- ODYSS3D — Detalles de pedido: transporte, dirección, colores
-- de filamento y accesorios (argollas, stickers, bolsas…)
-- ============================================================

-- ---------- colores de filamento disponibles ----------
create table if not exists public.filament_colors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  hex text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- catálogo de accesorios ----------
create table if not exists public.accessories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  price numeric(12,2) not null default 0,
  cost numeric(12,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- columnas nuevas de orders ----------
alter table public.orders
  add column if not exists transport_type text,
  add column if not exists delivery_address text,
  add column if not exists transport_cost numeric(12,2) not null default 0;

-- ---------- colores elegidos por ítem (nombres, snapshot) ----------
alter table public.order_items
  add column if not exists colors text[] not null default '{}';

-- ---------- accesorios de un pedido ----------
create table if not exists public.order_accessories (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  accessory_id uuid references public.accessories(id) on delete set null,
  name text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- índices ----------
create index if not exists idx_order_accessories_order_id on public.order_accessories (order_id);
create index if not exists idx_filament_colors_name on public.filament_colors (name);
create index if not exists idx_accessories_name on public.accessories (name);

-- ---------- RLS: solo admins ----------
alter table public.filament_colors enable row level security;
alter table public.accessories enable row level security;
alter table public.order_accessories enable row level security;

do $$
declare t text;
begin
  foreach t in array array['filament_colors', 'accessories', 'order_accessories']
  loop
    execute format('drop policy if exists "%s_admin_all" on public.%s', t, t);
    execute format(
      'create policy "%s_admin_all" on public.%s for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t, t
    );
  end loop;
end $$;