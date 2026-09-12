-- ============================================================
-- ODYSS3D — Panel administrativo (schema, RLS, storage)
-- Ejecutar en el SQL Editor de Supabase (o con la CLI).
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- helper: ¿el usuario actual es admin? ----------
-- (se define DESPUÉS de crear public.profiles, ya que language sql valida su cuerpo)

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  role text not null default 'admin' check (role in ('admin', 'staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- cada usuario de auth.users obtiene su perfil automáticamente
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    'admin'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- customers ----------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp text,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- products ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text,
  image text,
  print_minutes integer,
  grams numeric(10,2),
  production_cost numeric(12,2),
  sale_price numeric(12,2),
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- orders ----------
create sequence if not exists public.orders_number_seq;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  number integer not null default nextval('public.orders_number_seq') unique,
  customer_id uuid references public.customers(id) on delete restrict,
  status text not null default 'pendiente',
  total numeric(12,2) not null default 0,
  estimated_profit numeric(12,2) not null default 0,
  order_date date not null default current_date,
  estimated_delivery date,
  payment_method text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- order_items ----------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0,
  production_cost numeric(12,2),
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- order_images ----------
create table if not exists public.order_images (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  url text not null,
  label text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- product_images ----------
create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  created_at timestamptz not null default now()
);

-- ---------- settings (clave -> valor jsonb) ----------
create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ---------- índices ----------
create index if not exists idx_orders_customer_id on public.orders (customer_id);
create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_orders_order_date on public.orders (order_date desc);
create index if not exists idx_order_items_order_id on public.order_items (order_id);
create index if not exists idx_order_images_order_id on public.order_images (order_id);
create index if not exists idx_product_images_product_id on public.product_images (product_id);
create index if not exists idx_customers_lower_name on public.customers (lower(name));

-- ---------- RLS: solo admins autenticados ----------
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_images enable row level security;
alter table public.product_images enable row level security;
alter table public.settings enable row level security;

do $$
declare t text;
begin
  foreach t in array array['customers', 'products', 'orders', 'order_items', 'order_images', 'product_images', 'settings']
  loop
    execute format('drop policy if exists "%s_admin_all" on public.%s', t, t);
    execute format(
      'create policy "%s_admin_all" on public.%s for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t, t
    );
  end loop;
end $$;

-- profiles: los admins ven todo; cada usuario puede ver/editar su propio perfil
drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own" on public.profiles
  for select to authenticated
  using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------- storage: buckets privados ----------
insert into storage.buckets (id, name, public)
values
  ('products', 'products', false),
  ('orders', 'orders', false)
on conflict (id) do nothing;

drop policy if exists "products_storage_admin_all" on storage.objects;
create policy "products_storage_admin_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'products' and public.is_admin())
  with check (bucket_id = 'products' and public.is_admin());

drop policy if exists "orders_storage_admin_all" on storage.objects;
create policy "orders_storage_admin_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'orders' and public.is_admin())
  with check (bucket_id = 'orders' and public.is_admin());