-- ODYSS3D — Descuento en pedidos (porcentaje y monto fijo, sobre productos + accesorios)

alter table public.orders
  add column if not exists discount_percent numeric(5,2) not null default 0,
  add column if not exists discount_amount numeric(12,2) not null default 0;
