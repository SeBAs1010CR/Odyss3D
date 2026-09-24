"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  DEFAULT_CONFIG,
  DEFAULT_INPUTS,
  ROUNDING_OPTIONS,
  computeAll,
  formatCRC,
  formatMoney,
  formatPct,
  mergeConfig,
} from "../../lib/calculator"
import { Icons } from "./icons"
import {
  NumberField,
  Segmented,
  ToggleRow,
  PackOption,
  MoneyRow,
} from "./fields"
import ConfigPanel from "./ConfigPanel"

const PIN = "1013"
const K_CONFIG = "odyss3d.cal.config.v1"
const K_INPUTS = "odyss3d.cal.inputs.v1"
const K_LOCK = "odyss3d.cal.unlock.v1"

const cloneDefaults = () => JSON.parse(JSON.stringify(DEFAULT_CONFIG))

const sanitizeAmount = (raw) => {
  let s = String(raw ?? "").replace(/,/g, "").replace(/[^\d.]/g, "")
  const dot = s.indexOf(".")
  if (dot !== -1) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, "")
  return s
}

const sanitizeInt = (raw) => String(raw ?? "").replace(/[^\d]/g, "")

const toNum = (v) => {
  const f = parseFloat(String(v ?? "").replace(",", "."))
  return Number.isFinite(f) ? f : 0
}

function PinScreen({ onUnlock }) {
  const [pin, setPin] = useState("")
  const [error, setError] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    if (pin === PIN) onUnlock()
    else {
      setError(true)
      setPin("")
    }
  }

  return (
    <div className="calc-root">
      <div className="calc-bg">
        <span className="bg-grid" />
        <span className="bg-glow bg-glow-a" />
        <span className="bg-glow bg-glow-b" />
      </div>
      <div className="pin">
        <motion.div
          className="pin-card"
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <img src="/images/branding/logo-horizontal.png?v=2" alt="ODYSS3D" className="pin-logo" />
          <span className="pin-kicker">Herramienta interna</span>
          <div className="pin-icon">
            <Icons.Lock size={22} />
          </div>
          <h1 className="pin-title">Acceso restringido</h1>
          <p className="pin-sub">Ingresa el PIN de Odyss3D para abrir la calculadora de costos.</p>

          <form onSubmit={submit} className="pin-form">
            <motion.div animate={error ? { x: [0, -9, 9, -6, 6, 0] } : { x: 0 }} transition={{ duration: 0.35 }}>
              <input
                className="pin-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                placeholder="••••"
                value={pin}
                maxLength={6}
                onChange={(e) => {
                  setPin(sanitizeInt(e.target.value))
                  setError(false)
                }}
              />
            </motion.div>
            <motion.button
              type="submit"
              className="pin-btn"
              whileTap={{ scale: 0.98 }}
              disabled={!pin}
            >
              Acceder
            </motion.button>
          </form>

          <AnimatePresence>
            {error && (
              <motion.p
                className="pin-error"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                PIN incorrecto. Intenta de nuevo.
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
        <a className="pin-back" href="/">
          <Icons.ArrowLeft size={15} /> Volver al sitio
        </a>
      </div>
    </div>
  )
}

function CardHead({ icon, title, sub, right, center = false }) {
  return (
    <div className={`card-head ${center ? "card-head-center" : ""}`}>
      {icon && <span className="card-head-icon">{icon}</span>}
      <div className="card-head-text">
        <h2 className="card-head-title">{title}</h2>
        {sub && <p className="card-head-sub">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, delay, ease: "easeOut" } },
})

export default function CalculatorApp() {
  const [ready, setReady] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [config, setConfig] = useState(null)
  const [inputs, setInputs] = useState(null)

  useEffect(() => {
    let localConfig
    let localInputs
    try {
      const rawConfig = window.localStorage.getItem(K_CONFIG)
      localConfig = rawConfig ? mergeConfig(JSON.parse(rawConfig)) : cloneDefaults()
      const rawInputs = window.localStorage.getItem(K_INPUTS)
      localInputs = rawInputs ? { ...DEFAULT_INPUTS, ...JSON.parse(rawInputs) } : { ...DEFAULT_INPUTS }
    } catch {
      localConfig = cloneDefaults()
      localInputs = { ...DEFAULT_INPUTS }
    }
    setConfig(localConfig)
    setInputs(localInputs)
    setUnlocked(window.sessionStorage.getItem(K_LOCK) === "1")
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready || !config) return
    try {
      window.localStorage.setItem(K_CONFIG, JSON.stringify(config))
    } catch {
      /* noop */
    }
  }, [ready, config])

  useEffect(() => {
    if (!ready || !inputs) return
    try {
      window.localStorage.setItem(K_INPUTS, JSON.stringify(inputs))
    } catch {
      /* noop */
    }
  }, [ready, inputs])

  const derived = useMemo(() => computeAll(inputs, config), [inputs, config])

  if (!ready || !inputs || !config) {
    return (
      <div className="calc-root">
        <div className="calc-loading">
          <div className="spinner" />
        </div>
      </div>
    )
  }

  if (!unlocked) {
    return (
      <PinScreen
        onUnlock={() => {
          try {
            window.sessionStorage.setItem(K_LOCK, "1")
          } catch {
            /* noop */
          }
          setUnlocked(true)
        }}
      />
    )
  }

  const setInput = (key, value) => setInputs((s) => ({ ...s, [key]: value }))

  const resetAll = () => setInputs({ ...DEFAULT_INPUTS })

  const handleCost = (key, raw) =>
    setConfig((c) => ({ ...c, costs: { ...c.costs, [key]: toNum(raw) } }))
  const handleRing = (raw) => setConfig((c) => ({ ...c, accessories: { ...c.accessories, ring: toNum(raw) } }))
  const handlePack = (key, raw) =>
    setConfig((c) => ({ ...c, packaging: { ...c.packaging, [key]: toNum(raw) } }))
  const handleMargin = (idx, raw) =>
    setConfig((c) => {
      const margins = c.margins.map((m, i) => (i === idx ? { ...m, value: toNum(raw) / 100 } : m))
      return { ...c, margins }
    })
  const handleMinimum = (raw) => setConfig((c) => ({ ...c, minimumPrice: toNum(raw) }))
  const handleResetConfig = () => setConfig(cloneDefaults())

  const d = derived
  const pct = formatPct(d.margin)
  const autoPct = formatPct(d.recommendedMargin)
  const isManual = d.isManualMargin
  const marginShown = isManual ? {
    value: String(inputs.marginOverride ?? ""),
    onChange: (v) => setInput("marginOverride", sanitizeAmount(v).slice(0, 5)),
  } : {
    value: autoPct,
    onChange: (v) => setInput("marginOverride", sanitizeAmount(v).slice(0, 5)),
  }

  const ROW_ICONS = {
    filament: <Icons.Spool />,
    electricity: <Icons.Bolt />,
    machine: <Icons.Printer />,
    ring: <Icons.Ring />,
    packaging: <Icons.Bag />,
  }

  const plural = d.quantity === 1 ? "pieza" : "piezas"

  return (
    <div className="calc-root">
      <div className="calc-bg">
        <span className="bg-grid" />
        <span className="bg-glow bg-glow-a" />
        <span className="bg-glow bg-glow-b" />
      </div>

      <div className="calc-shell">
        <header className="calc-head">
          <motion.div className="calc-head-brand" {...fadeUp(0)}>
            <img src="/images/branding/logo-horizontal.png?v=2" alt="ODYSS3D" className="calc-logo" />
            <span className="calc-title">Calculadora de costos</span>
            <span className="calc-badge">Interna</span>
          </motion.div>
          <motion.div className="calc-head-actions" {...fadeUp(0.05)}>
            <button type="button" className="btn-g" onClick={resetAll}>
              <Icons.Refresh size={16} /> <span>Restablecer</span>
            </button>
            <button type="button" className="btn-g btn-g-accent" onClick={() => setShowConfig(true)}>
              <Icons.Gear size={16} /> <span>Configuración</span>
            </button>
          </motion.div>
        </header>

        <motion.p className="calc-sub" {...fadeUp(0.08)}>
          Calcula el costo real de cada impresión y encuentra el precio ideal de venta.
        </motion.p>

        <main className="calc-grid">
          {/* ===================== ENTRADA ===================== */}
          <motion.section className="calc-card col-time" {...fadeUp(0.1)}>
            <CardHead icon={<Icons.Clock />} title="Datos de impresión" sub="Tiempo de máquina" />
            <div className="grid2">
              <NumberField label="Horas" value={inputs.hours} placeholder="0" suffix="h" onChange={(v) => setInput("hours", sanitizeInt(v).slice(0, 4))} />
              <NumberField label="Minutos" value={inputs.minutes} placeholder="0" suffix="min" onChange={(v) => setInput("minutes", sanitizeInt(v).slice(0, 4))} />
            </div>
            <div className="meta-note">
              Equivale a <b>{formatCRC(d.minutes, 0)}</b> minutos de impresión
            </div>
          </motion.section>

          <motion.section className="calc-card col-fil" {...fadeUp(0.15)}>
            <CardHead icon={<Icons.Spool />} title="Filamento" sub="Escribe cuánto pagaste por tu filamento" />
            <NumberField label="Filamento utilizado" value={inputs.grams} placeholder="0" suffix="g" onChange={(v) => setInput("grams", sanitizeAmount(v).slice(0, 7))} />
            <div className="grid2">
              <NumberField label="Precio del filamento" value={inputs.filamentPrice} placeholder="10000" prefix="₡" onChange={(v) => setInput("filamentPrice", sanitizeAmount(v).slice(0, 9))} />
              <NumberField label="Peso del rollo" value={inputs.rollWeight} placeholder="1000" suffix="g" onChange={(v) => setInput("rollWeight", sanitizeAmount(v).slice(0, 6))} />
            </div>
            <div className="meta-note">
              Costo por gramo: <b>₡{formatCRC(d.costPerGram, 2)}</b>
            </div>
          </motion.section>

          <motion.section className="calc-card col-qty" {...fadeUp(0.2)}>
            <CardHead icon={<Icons.Layers />} title="Cantidad de piezas" sub="El margen recomendado cambia según la cantidad" />
            <NumberField label="Cantidad" value={inputs.quantity} placeholder="1" onChange={(v) => setInput("quantity", sanitizeInt(v).slice(0, 6))} />

            <div className="margin-box">
              <div className="margin-head">
                <span>Margen de ganancia</span>
                {isManual ? (
                  <span className="margin-chip margin-chip-manual">manual</span>
                ) : (
                  <span className="margin-chip">automático</span>
                )}
              </div>
              <div className="margin-control">
                <input
                  type="text"
                  inputMode="decimal"
                  value={marginShown.value}
                  onChange={marginShown.onChange}
                  placeholder={autoPct}
                />
                <span className="margin-suffix">%</span>
                {isManual && (
                  <button
                    type="button"
                    className="margin-auto-btn"
                    title="Usar margen recomendado"
                    onClick={() => setInput("marginOverride", null)}
                  >
                    <Icons.Spark size={14} />
                  </button>
                )}
              </div>
              <div className="margin-hint">
                {isManual ? (
                  <>Recomendado: <b>{autoPct}%</b> para {d.quantity} {plural}</>
                ) : (
                  <>Recomendado para {d.quantity} {plural}</>
                )}
              </div>
            </div>
          </motion.section>

          <motion.section className="calc-card col-extras" {...fadeUp(0.25)}>
            <CardHead icon={<Icons.Cube />} title="Extras" sub="Accesorios por pieza" />
            <div className="toggle-stack">
              <ToggleRow
                icon={<Icons.Ring />}
                title="Argolla"
                desc={`Agrega ₡${formatCRC(config.accessories.ring, 0)} por pieza`}
                checked={inputs.ring}
                onChange={(v) => setInput("ring", v)}
              />
            </div>
          </motion.section>

          <motion.section className="calc-card col-pack" {...fadeUp(0.3)}>
            <CardHead icon={<Icons.Bag />} title="Empaque" sub="Elige el tipo de bolsa" />
            <div className="pack-grid">
              <PackOption
                icon={<Icons.Box />}
                title="Sin bolsa"
                price="Gratis"
                active={inputs.packaging === "none"}
                onClick={() => setInput("packaging", "none")}
              />
              <PackOption
                icon={<Icons.Bag />}
                title="Pequeña"
                price={`₡${formatCRC(config.packaging.small, 0)}`}
                active={inputs.packaging === "small"}
                onClick={() => setInput("packaging", "small")}
              />
              <PackOption
                icon={<Icons.Bag />}
                title="Mediana"
                price={`₡${formatCRC(config.packaging.medium, 0)}`}
                active={inputs.packaging === "medium"}
                onClick={() => setInput("packaging", "medium")}
              />
              <PackOption
                icon={<Icons.Bag />}
                title="Grande"
                price={`₡${formatCRC(config.packaging.large, 0)}`}
                active={inputs.packaging === "large"}
                onClick={() => setInput("packaging", "large")}
              />
            </div>
          </motion.section>

          {/* ===================== RESULTADOS ===================== */}
          <motion.section className="calc-card calc-card-hero col-price" {...fadeUp(0.15)}>
            <CardHead icon={<Icons.Tag />} title="Precio recomendado" sub="por pieza" center />
            <div className="hero-amount">
              <span className="crc">₡</span>
              <motion.span
                key={formatMoney(d.pricePerUnit)}
                initial={{ opacity: 0, y: 8, filter: "blur(3px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                {formatMoney(d.pricePerUnit)}
              </motion.span>
            </div>
            <p className="hero-caption">precio mínimo de venta por unidad</p>

            <Segmented
              className="seg-hero"
              options={ROUNDING_OPTIONS}
              value={inputs.rounding}
              onChange={(v) => setInput("rounding", v)}
            />

            <div className="hero-stats">
              <div className="hstat">
                <span className="hstat-label">Costo</span>
                <span className="hstat-value">₡{formatMoney(d.costPerUnit)}</span>
              </div>
              <div className="hstat hstat-green">
                <span className="hstat-label">Ganancia</span>
                <span className="hstat-value">₡{formatMoney(d.profitPerUnit)}</span>
              </div>
              <div className="hstat hstat-blue">
                <span className="hstat-label">Margen</span>
                <span className="hstat-value">{pct}%</span>
              </div>
            </div>

            <AnimatePresence>
              {(d.minPriceApplied || d.roundingApplied) && (
                <motion.div
                  className="hero-notes"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {d.minPriceApplied && (
                    <div className="note note-amber">
                      <Icons.Tag size={14} /> Se aplicó el precio mínimo. El precio salía en ₡{formatMoney(d.rawPrice)}, se usó ₡{formatCRC(d.minimumPrice, 0)}.
                    </div>
                  )}
                  {d.roundingApplied && (
                    <div className="note note-blue">
                      <Icons.Calc size={14} />
                      Precio calculado ₡{formatMoney(d.roundingOriginal)} → redondeado a ₡{formatMoney(d.pricePerUnit)}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>

          <motion.section className="calc-card col-cost" {...fadeUp(0.2)}>
            <CardHead icon={<Icons.Receipt />} title="Costo de producción" sub="por pieza" />
            <div className="money-rows">
              {d.costRows.map((row) => (
                <MoneyRow
                  key={row.id}
                  icon={ROW_ICONS[row.id]}
                  label={row.label}
                  note={row.note}
                  value={`₡${formatMoney(row.value)}`}
                />
              ))}
              {d.costRows.length === 0 && <p className="mrow-empty">Sin costos todavía</p>}
            </div>
            <div className="cost-total">
              <span className="cost-total-label">Costo total por pieza</span>
              <span className="cost-total-value">₡{formatMoney(d.costPerUnit)}</span>
            </div>
          </motion.section>

          <motion.section className="calc-card col-gain" {...fadeUp(0.25)}>
            <CardHead icon={<Icons.Chart />} title="Ganancia del pedido" sub={`${d.quantity} ${plural} a ₡${formatMoney(d.pricePerUnit)} cada una`} />
            <div className="order-sub">
              <span className="order-sub-label">{d.quantity} {plural} × ₡{formatMoney(d.pricePerUnit)}</span>
              <span className="order-sub-value">₡{formatMoney(d.orderTotal)}</span>
            </div>
            <div className="order-rows">
              <div className="order-row order-row-total">
                <span className="order-row-label">TOTAL DEL PEDIDO</span>
                <span className="order-row-value">₡{formatMoney(d.orderTotal)}</span>
              </div>
              <div className="order-row order-row-profit">
                <span className="order-row-label">GANANCIA TOTAL</span>
                <span className="order-row-value">₡{formatMoney(d.orderProfit)}</span>
              </div>
            </div>
          </motion.section>

          <motion.section className="calc-card col-break" {...fadeUp(0.3)}>
            <CardHead icon={<Icons.Calc />} title="Desglose del cálculo" sub="De tu costo al precio de venta" />
            <div className="pipe">
              <div className="pipe-row">
                <span className="pipe-label">Costo real</span>
                <span className="pipe-value">₡{formatMoney(d.costPerUnit)}</span>
              </div>
              <div className="pipe-row">
                <span className="pipe-label">Margen aplicado</span>
                <span className="pipe-value">{pct}%</span>
              </div>
              <div className="pipe-row pipe-row-big">
                <span className="pipe-label">Precio de venta</span>
                <span className="pipe-value pipe-blue">₡{formatMoney(d.pricePerUnit)}</span>
              </div>
              <div className="pipe-row pipe-row-green">
                <span className="pipe-label">Ganancia</span>
                <span className="pipe-value">₡{formatMoney(d.profitPerUnit)}</span>
              </div>
            </div>
          </motion.section>
        </main>

        <footer className="calc-foot">
          <span>© {new Date().getFullYear()} ODYSS3D · Herramienta interna de costos</span>
          <a className="calc-foot-link" href="/">
            Ver el sitio
          </a>
        </footer>
      </div>

      <ConfigPanel
        open={showConfig}
        onClose={() => setShowConfig(false)}
        config={config}
        onCost={handleCost}
        onRing={handleRing}
        onPack={handlePack}
        onMargin={handleMargin}
        onMinimum={handleMinimum}
        onReset={handleResetConfig}
      />
    </div>
  )
}