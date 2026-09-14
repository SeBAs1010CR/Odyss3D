-- ============================================================
-- ODYSS3D — Fondo de maquinaria (reserva de ganancia)
-- ============================================================

alter table public.orders
  add column if not exists machine_fund numeric(12,2) not null default 0;