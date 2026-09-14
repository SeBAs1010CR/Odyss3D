import type { OrderStatus, SettingsRecord } from "./types";

export const ADMIN_EMAIL_DOMAIN = "odyss3d.com";

export const STATUSES: { id: OrderStatus; label: string }[] = [
  { id: "cotizacion", label: "Cotización" },
  { id: "pendiente", label: "Pendiente" },
  { id: "pago_pendiente", label: "Pago pendiente" },
  { id: "en_produccion", label: "En producción" },
  { id: "listo", label: "Listo" },
  { id: "entregado", label: "Entregado" },
  { id: "cancelado", label: "Cancelado" },
];

export const STATUS_LABEL: Record<OrderStatus, string> = Object.fromEntries(
  STATUSES.map((s) => [s.id, s.label])
) as Record<OrderStatus, string>;

export const ACTIVE_STATUSES = new Set<OrderStatus>([
  "pendiente",
  "pago_pendiente",
  "en_produccion",
  "listo",
  "entregado",
]);

export const PAYMENT_METHODS = [
  "Efectivo",
  "Sinpe Móvil",
  "Transferencia",
  "Tarjeta",
  "Pago parcial",
  "Pendiente",
] as const;

export const TRANSPORT_TYPES = [
  "Recogida en tienda",
  "Envío mensajero",
  "Uber / PedidosYa",
  "Correos de Costa Rica",
  "Moovin",
  "Envío por acordar",
] as const;

export const PRODUCT_CATEGORIES = [
  "Impreso 3D",
  "Figuras",
  "Llaveros",
  "Accesorios",
  "Repuestos",
  "Diseño",
  "Maquetas",
  "Otro",
] as const;

export const SETTINGS_FIELDS: {
  key: keyof SettingsRecord;
  label: string;
  defaultValue: number;
  suffix: string;
  step?: number;
  hint?: string;
}[] = [
  { key: "electricity_per_minute", label: "Electricidad por minuto", defaultValue: 0.28, suffix: "₡", step: 0.01 },
  { key: "machine_per_hour", label: "Máquina por hora", defaultValue: 180, suffix: "₡" },
  { key: "ring_cost", label: "Costo argolla", defaultValue: 100, suffix: "₡" },
  { key: "bag_small", label: "Bolsa pequeña", defaultValue: 50, suffix: "₡" },
  { key: "bag_medium", label: "Bolsa mediana", defaultValue: 100, suffix: "₡" },
  { key: "bag_large", label: "Bolsa grande", defaultValue: 200, suffix: "₡" },
  { key: "margin_1_4", label: "Margen 1–4 piezas", defaultValue: 50, suffix: "%", hint: "Porcentaje sobre el costo" },
  { key: "margin_5_19", label: "Margen 5–19 piezas", defaultValue: 45, suffix: "%" },
  { key: "margin_20_49", label: "Margen 20–49 piezas", defaultValue: 40, suffix: "%" },
  { key: "margin_50_99", label: "Margen 50–99 piezas", defaultValue: 35, suffix: "%" },
  { key: "margin_100", label: "Margen 100+ piezas", defaultValue: 30, suffix: "%" },
  { key: "minimum_price", label: "Precio mínimo", defaultValue: 800, suffix: "₡" },
  { key: "discount_20", label: "Descuento 21–50 uds", defaultValue: 18.75, suffix: "%", step: 0.01, hint: "Se aplica sobre el precio del catálogo" },
  { key: "discount_50", label: "Descuento 51–100 uds", defaultValue: 25, suffix: "%", step: 0.01 },
  { key: "discount_100", label: "Descuento 101+ uds", defaultValue: 37.5, suffix: "%", step: 0.01 },
  { key: "min_margin", label: "Margen mínimo", defaultValue: 40, suffix: "%", hint: "El precio nunca baja de costo ÷ (1 − margen)" },
  { key: "machine_fund_percent", label: "Reserva de maquinaria", defaultValue: 10, suffix: "%", hint: "Se descuenta de la ganancia para reemplazo de impresoras" },
];

export const SETTINGS_DEFAULTS: SettingsRecord = Object.fromEntries(
  SETTINGS_FIELDS.map((f) => [f.key, f.defaultValue])
) as SettingsRecord;

export const STAT_RANGES: { id: "week" | "month" | "3months" | "year"; label: string }[] = [
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mes" },
  { id: "3months", label: "Últimos 3 meses" },
  { id: "year", label: "Este año" },
];