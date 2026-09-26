import {
  applyRounding,
  computeAll,
  mergeConfig,
  ROUNDING_OPTIONS,
} from "@/lib/calculator";
import type { CalculatorSharedSettings } from "@/lib/admin/types";

const K_CONFIG = "odyss3d.cal.config.v1";
const K_INPUTS = "odyss3d.cal.inputs.v1";
const MIN_COST = 400;

function readLS<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export type ProductPricingResult = {
  productionCost: number;
  salePrice: number;
  minCostApplied: boolean;
  marginPercent: number;
  roundingId: string;
  roundingApplied: boolean;
};

/**
 * Calcula costo de producción y precio de venta sugerido usando la misma
 * lógica de la calculadora (/cal):
 *   - costo = filamento + electricidad + máquina (con el límite de mínimo ₡400)
 *   - precio de venta = costo ÷ (1 − margen) (margen real: 50% significa 50% del precio)
 *
 * Si `shared` viene de Configuración > Calculadora se usa esa config (fuente
 * autoritativa); si no, se usa la config guardada en localStorage por la calc.
 */
export function computeProductPricing(
  gramsRaw: string,
  minutesRaw: string,
  shared?: CalculatorSharedSettings | null
): ProductPricingResult | null {
  const grams = Number.parseFloat(String(gramsRaw).replace(",", "."));
  const minutes = Number.parseFloat(String(minutesRaw).replace(",", "."));
  if (!Number.isFinite(grams) || grams <= 0) return null;
  if (!Number.isFinite(minutes) || minutes < 0) return null;

  const config = mergeConfig(
    shared?.config && Object.keys(shared.config).length > 0
      ? shared.config
      : readLS<Record<string, unknown>>(K_CONFIG)
  );
  const inputs = readLS<{
    rounding?: string;
    filamentPrice?: string | number;
    rollWeight?: string | number;
  }>(K_INPUTS);
  const roundingId =
    shared?.rounding && ROUNDING_OPTIONS.some((r) => r.id === shared.rounding)
      ? shared.rounding
      : inputs?.rounding && ROUNDING_OPTIONS.some((r) => r.id === inputs.rounding)
        ? inputs.rounding
        : "100";

  const calcInputs: Record<string, unknown> = {
    hours: 0,
    minutes: String(Math.round(minutes)),
    grams: String(grams),
    quantity: "1",
    rounding: roundingId,
  };
  const filament =
    shared && Number.isFinite(shared.filamentPrice) && shared.filamentPrice > 0
      ? shared.filamentPrice
      : inputs?.filamentPrice;
  if (String(filament ?? "").trim() !== "") {
    calcInputs.filamentPrice = filament;
  }
  const roll =
    shared && Number.isFinite(shared.rollWeight) && shared.rollWeight > 0
      ? shared.rollWeight
      : inputs?.rollWeight;
  if (String(roll ?? "").trim() !== "") {
    calcInputs.rollWeight = roll;
  }

  const total = computeAll(calcInputs, config);

  const rawCost = total.costPerUnit;
  const minCostApplied = rawCost < MIN_COST;
  const productionCost = Math.max(rawCost, MIN_COST);

  const rawSale = productionCost / (1 - total.margin);
  const minSale = Math.max(rawSale, total.minimumPrice);
  const roundingValue = ROUNDING_OPTIONS.find((r) => r.id === roundingId)?.value ?? 0;
  const rounded = applyRounding(minSale, roundingValue);

  return {
    productionCost: Math.round(productionCost),
    salePrice: rounded.final,
    minCostApplied,
    marginPercent: Math.round(total.marginPercent * 10) / 10,
    roundingId,
    roundingApplied: rounded.applied,
  };
}