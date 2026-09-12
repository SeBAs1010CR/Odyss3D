export const ROUNDING_OPTIONS = [
  { id: "none", label: "Sin redondear", value: 0 },
  { id: "50", label: "₡50", value: 50 },
  { id: "100", label: "₡100", value: 100 },
  { id: "500", label: "₡500", value: 500 },
  { id: "1000", label: "₡1.000", value: 1000 },
]

export const PACKAGING_LABELS = {
  none: "Sin bolsa",
  small: "Bolsa pequeña",
  medium: "Bolsa mediana",
  large: "Bolsa grande",
}

export const MARGIN_TIER_LABELS = [
  "1–4 piezas",
  "5–19 piezas",
  "20–49 piezas",
  "50–99 piezas",
  "100+ piezas",
]

export const DEFAULT_CONFIG = {
  costs: {
    electricityPerMinute: 0.28,
    machinePerHour: 180,
  },
  accessories: {
    ring: 100,
  },
  packaging: {
    none: 0,
    small: 50,
    medium: 100,
    large: 200,
  },
  margins: [
    { min: 1, max: 4, value: 0.5 },
    { min: 5, max: 19, value: 0.45 },
    { min: 20, max: 49, value: 0.4 },
    { min: 50, max: 99, value: 0.35 },
    { min: 100, max: 9999999, value: 0.3 },
  ],
  minimumPrice: 800,
}

export const DEFAULT_INPUTS = {
  hours: "4",
  minutes: "30",
  grams: "30",
  filamentPrice: "10000",
  rollWeight: "1000",
  quantity: "1",
  ring: false,
  packaging: "none",
  marginOverride: null,
  rounding: "none",
}

const safeNum = (v) => {
  let n
  if (typeof v === "number") n = v
  else if (typeof v === "string") n = parseFloat(v.replace(",", "."))
  else n = NaN
  return Number.isFinite(n) ? n : 0
}

export const toMinutes = (hours, minutes) => {
  const h = Math.max(0, Math.round(safeNum(hours)))
  const m = Math.max(0, Math.round(safeNum(minutes)))
  return h * 60 + m
}

export const getRecommendedMargin = (quantity, margins = DEFAULT_CONFIG.margins) => {
  const qty = Math.max(1, Math.round(safeNum(quantity)))
  const tier = (margins || []).find((m) => qty >= m.min && qty <= m.max)
  if (tier) return clampMargin(tier.value)
  return 0.3
}

const clampMargin = (m) => Math.min(Math.max(safeNum(m), 0), 3)

export const calculateFilamentCost = (grams, filamentPrice, rollWeight) => {
  const g = Math.max(0, safeNum(grams))
  const price = Math.max(0, safeNum(filamentPrice))
  const roll = Math.max(1, safeNum(rollWeight))
  return (g * price) / roll
}

export const calculateFilamentCostPerGram = (filamentPrice, rollWeight) => {
  const price = Math.max(0, safeNum(filamentPrice))
  const roll = Math.max(1, safeNum(rollWeight))
  return price / roll
}

export const calculateElectricityCost = (minutes, perMinute = DEFAULT_CONFIG.costs.electricityPerMinute) =>
  minutes * Math.max(0, safeNum(perMinute))

export const calculateMachineCost = (minutes, perHour = DEFAULT_CONFIG.costs.machinePerHour) =>
  minutes * (Math.max(0, safeNum(perHour)) / 60)

export const calculateExtrasCost = ({ ring = false, packaging = "none" }, config = DEFAULT_CONFIG) => {
  let total = 0
  if (ring) total += Math.max(0, safeNum(config.accessories.ring))
  if (packaging && packaging !== "none") total += Math.max(0, safeNum(config.packaging[packaging]))
  return total
}

export const calculateTotalCost = ({ filament, electricity, machine, extras }) =>
  Math.max(0, safeNum(filament) + safeNum(electricity) + safeNum(machine) + safeNum(extras))

export const calculateSellingPrice = (cost, margin) =>
  Math.max(0, safeNum(cost) * (1 + clampMargin(margin)))

export const calculateProfit = (sellingPrice, cost) => sellingPrice - cost

export const applyMinimumPrice = (price, minimumPrice) => {
  const min = Math.max(0, safeNum(minimumPrice))
  const base = Math.max(0, safeNum(price))
  if (min > 0 && base < min) return { final: min, applied: true, minimum: min }
  return { final: base, applied: false, minimum: min }
}

export const applyRounding = (price, roundingValue) => {
  const base = Math.max(0, safeNum(price))
  const factor = Math.round(safeNum(roundingValue))
  if (!factor) return { final: base, original: base, applied: false }
  const final = Math.ceil(base / factor) * factor
  return { final, original: base, applied: final !== base }
}

export const formatCRC = (value, decimals = 0) => {
  const num = safeNum(value)
  const fixed = num.toFixed(decimals)
  const [intPart, decPart] = fixed.split(".")
  const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return decimals > 0 && decPart ? `${withSep},${decPart}` : withSep
}

export const formatMoney = (value) => {
  const num = Math.max(0, safeNum(value))
  const hasDecimals = Math.abs(num % 1) >= 0.005
  return hasDecimals ? formatCRC(num, 2) : formatCRC(Math.round(num), 0)
}

export const formatPct = (margin) => {
  const p = safeNum(margin) * 100
  const rounded = Math.round(p * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(/\.0$/, "")
}

export const computeAll = (rawInputs, rawConfig) => {
  const i = { ...DEFAULT_INPUTS, ...(rawInputs || {}) }
  const c = mergeConfig(rawConfig)

  const hours = Math.max(0, Math.round(safeNum(i.hours)))
  const minutes = toMinutes(i.hours, i.minutes)
  const grams = Math.max(0, safeNum(i.grams))
  const filamentPrice = Math.max(0, safeNum(i.filamentPrice))
  const rollWeight = Math.max(1, safeNum(i.rollWeight))
  const quantity = Math.max(1, Math.round(safeNum(i.quantity)))

  const costPerGram = calculateFilamentCostPerGram(filamentPrice, rollWeight)
  const filament = calculateFilamentCost(grams, filamentPrice, rollWeight)
  const electricity = calculateElectricityCost(minutes, c.costs.electricityPerMinute)
  const machinePerMinute = c.costs.machinePerHour / 60
  const machine = calculateMachineCost(minutes, c.costs.machinePerHour)

  const hasRing = !!i.ring
  const packagingKey = i.packaging || "none"
  const ringCost = hasRing ? Math.max(0, safeNum(c.accessories.ring)) : 0
  const packagingCost = packagingKey !== "none" ? Math.max(0, safeNum(c.packaging[packagingKey])) : 0
  const extras = calculateExtrasCost({ ring: hasRing, packaging: packagingKey }, c)

  const costPerUnit = calculateTotalCost({ filament, electricity, machine, extras })

  const recommendedMargin = getRecommendedMargin(quantity, c.margins)
  const hasOverride =
    i.marginOverride !== null && i.marginOverride !== undefined && String(i.marginOverride) !== ""
  const overrideMargin = hasOverride ? clampMargin(safeNum(i.marginOverride) / 100) : null
  const margin = overrideMargin !== null ? overrideMargin : recommendedMargin

  const rawPrice = calculateSellingPrice(costPerUnit, margin)
  const minPriceResult = applyMinimumPrice(rawPrice, c.minimumPrice)
  const roundingOption =
    ROUNDING_OPTIONS.find((r) => r.id === i.rounding) || ROUNDING_OPTIONS[0]
  const roundingResult = applyRounding(minPriceResult.final, roundingOption.value)

  const pricePerUnit = roundingResult.final
  const profitPerUnit = calculateProfit(pricePerUnit, costPerUnit)
  const orderTotal = pricePerUnit * quantity
  const orderProfit = profitPerUnit * quantity

  const costRows = [
    {
      id: "filament",
      label: "Filamento",
      value: filament,
      note: `${formatCRC(grams, 0)} g × ₡${formatCRC(costPerGram, 2)}`,
    },
    {
      id: "electricity",
      label: "Electricidad",
      value: electricity,
      note: `${formatCRC(minutes, 0)} min × ₡${formatCRC(c.costs.electricityPerMinute, 2)}`,
    },
    {
      id: "machine",
      label: "Máquina",
      value: machine,
      note: `${formatCRC(minutes, 0)} min × ₡${formatCRC(machinePerMinute, 2)} · incluye mantenimiento y desgaste`,
    },
  ]
  if (hasRing) {
    costRows.push({ id: "ring", label: "Argolla", value: ringCost, note: "accesorio extra" })
  }
  if (packagingKey !== "none") {
    costRows.push({
      id: "packaging",
      label: PACKAGING_LABELS[packagingKey],
      value: packagingCost,
      note: "empaque",
    })
  }

  return {
    hours,
    minutes,
    grams,
    filamentPrice,
    rollWeight,
    quantity,
    costPerGram,
    filament,
    electricity,
    machine,
    machinePerMinute,
    extras,
    ringCost,
    packagingKey,
    packagingLabel: packagingKey === "none" ? null : PACKAGING_LABELS[packagingKey],
    packagingCost,
    costRows,
    costPerUnit,
    recommendedMargin,
    margin,
    marginPercent: margin * 100,
    rawPrice,
    minPriceApplied: minPriceResult.applied,
    minimumPrice: minPriceResult.minimum,
    roundingOption,
    roundingApplied: roundingResult.applied,
    roundingOriginal: roundingResult.original,
    pricePerUnit,
    profitPerUnit,
    orderTotal,
    orderProfit,
    isManualMargin: overrideMargin !== null,
  }
}

export const mergeConfig = (saved) => {
  const base = JSON.parse(JSON.stringify(DEFAULT_CONFIG))
  if (!saved || typeof saved !== "object") return base
  base.costs = { ...base.costs, ...(saved.costs || {}) }
  base.accessories = { ...base.accessories, ...(saved.accessories || {}) }
  base.packaging = { ...base.packaging, ...(saved.packaging || {}) }
  if (Array.isArray(saved.margins) && saved.margins.length === base.margins.length) {
    base.margins = saved.margins
  }
  if (typeof saved.minimumPrice === "number" || typeof saved.minimumPrice === "string") {
    base.minimumPrice = safeNum(saved.minimumPrice)
  }
  return base
}