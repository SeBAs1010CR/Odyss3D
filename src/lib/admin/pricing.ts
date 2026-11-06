import { SETTINGS_DEFAULTS } from "./constants";
import type { SettingsRecord } from "./types";

/** Porcentaje de descuento según la cantidad (más de 20, 50 y 100). */
export function discountPercent(qty: number, s: SettingsRecord): number {
  const settings = { ...SETTINGS_DEFAULTS, ...s };
  if (qty >= 101) return settings.discount_100 ?? 0;
  if (qty >= 51) return settings.discount_50 ?? 0;
  if (qty >= 21) return settings.discount_20 ?? 0;
  return 0;
}

/**
 * Precio automático con descuento por cantidad.
 * Nunca cae por debajo de cost / (1 − margen mínimo) → 40% de ganancia.
 */
export function discountedPrice(
  qty: number,
  base: number,
  cost: number | null | undefined,
  s: SettingsRecord
): number {
  const settings = { ...SETTINGS_DEFAULTS, ...s };
  if (!base || base <= 0) return base;

  const disc = (settings.discount_100 > 0 && qty >= 101
    ? settings.discount_100
    : settings.discount_50 > 0 && qty >= 51
      ? settings.discount_50
      : settings.discount_20 > 0 && qty >= 21
        ? settings.discount_20
        : 0) / 100;

  let price = Math.round(base * (1 - disc) * 100) / 100;

  const costValue = cost ?? 0;
  const minMargin = settings.min_margin ?? 0;
  if (costValue > 0 && minMargin > 0 && minMargin < 100) {
    const floor = costValue / (1 - minMargin / 100);
    if (price < floor) price = Math.ceil(floor * 100) / 100;
  }

  return Math.round(price * 100) / 100;
}

/** Reserva para mantenimiento de impresoras (mantenimiento, repuestos…). */
export function machineFund(profit: number, s: SettingsRecord): number {
  const settings = { ...SETTINGS_DEFAULTS, ...s };
  const pct = settings.machine_fund_percent ?? 0;
  return Math.round(profit * (pct / 100) * 100) / 100;
}

export function netProfit(profit: number, s: SettingsRecord): number {
  return Math.round((profit - machineFund(profit, s)) * 100) / 100;
}
/** Descuento de pedido: porcentaje sobre el subtotal y luego monto fijo. El transporte no se descuenta. */
export function applyOrderDiscount(subtotal: number, percent: number, amount: number) {
  const pct = Math.min(100, Math.max(0, percent || 0));
  const amt = Math.max(0, amount || 0);
  const afterPct = subtotal * (1 - pct / 100);
  const total = Math.max(0, Math.round((afterPct - amt) * 100) / 100);
  const discount = Math.round((subtotal - total) * 100) / 100;
  return { percent: pct, amount: amt, total, discount };
}
