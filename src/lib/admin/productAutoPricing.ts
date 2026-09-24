import {
  applyRounding,
  computeAll,
  mergeConfig,
  ROUNDING_OPTIONS,
} from "@/lib/calculator";

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
 *   - precio de venta = costo × (1 + margen), con el mínimo y el redondeo de la calc
 */
export function computeProductPricing(
  gramsRaw: string,
  minutesRaw: string
): ProductPricingResult | null {
  const grams = Number.parseFloat(String(gramsRaw).replace(",", "."));
  const minutes = Number.parseFloat(String(minutesRaw).replace(",", "."));
  if (!Number.isFinite(grams) || grams <= 0) return null;
  if (!Number.isFinite(minutes) || minutes < 0) return null;

  const config = mergeConfig(readLS<Record<string, unknown>>(K_CONFIG));
  const inputs = readLS<{ rounding?: string }>(K_INPUTS);
  const roundingId =
    inputs?.rounding && ROUNDING_OPTIONS.some((r) => r.id === inputs.rounding)
      ? inputs.rounding
      : "100";

  const total = computeAll(
    {
      hours: 0,
      minutes: String(Math.round(minutes)),
      grams: String(grams),
      quantity: "1",
      rounding: roundingId,
    },
    config
  );

  const rawCost = total.costPerUnit;
  const minCostApplied = rawCost < MIN_COST;
  const productionCost = Math.max(rawCost, MIN_COST);

  const rawSale = productionCost * (1 + total.margin);
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