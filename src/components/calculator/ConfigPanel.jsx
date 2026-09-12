"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Icons } from "./icons"
import { MARGIN_TIER_LABELS } from "../../lib/calculator"

function NumField({ label, value, prefix, suffix, onChange, hint }) {
  return (
    <label className="cfg-field">
      <span className="cfg-field-label">{label}</span>
      <span className="cfg-input">
        {prefix && <span className="ti-prefix">{prefix}</span>}
        <input
          type="number"
          step="any"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix && <span className="ti-suffix">{suffix}</span>}
      </span>
      {hint && <span className="cfg-field-hint">{hint}</span>}
    </label>
  )
}

export default function ConfigPanel({
  open,
  onClose,
  config,
  onCost,
  onRing,
  onPack,
  onMargin,
  onMinimum,
  onReset,
}) {
  const stop = (e) => e.stopPropagation()

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-veil"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Configuración"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={stop}
          >
            <div className="modal-head">
              <span className="modal-head-icon">
                <Icons.Gear size={20} />
              </span>
              <div>
                <h3 className="modal-title">Configuración</h3>
                <p className="modal-sub">Valores usados para calcular los costos. Cambian al instante.</p>
              </div>
              <button className="modal-close" type="button" onClick={onClose} aria-label="Cerrar">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M5 5l14 14M19 5L5 19" />
                </svg>
              </button>
            </div>

            <div className="modal-body">
              <section className="modal-section">
                <h4 className="modal-sec-title">
                  <Icons.Bolt size={16} /> Costos de producción
                </h4>
                <div className="modal-grid">
                  <NumField
                    label="Electricidad por minuto"
                    prefix="₡"
                    value={config.costs.electricityPerMinute}
                    onChange={(v) => onCost("electricityPerMinute", v)}
                    hint="Costo de energía por cada minuto de impresión"
                  />
                  <NumField
                    label="Máquina por hora"
                    prefix="₡"
                    value={config.costs.machinePerHour}
                    onChange={(v) => onCost("machinePerHour", v)}
                    hint="Incluye mantenimiento y desgaste"
                  />
                </div>
              </section>

              <section className="modal-section">
                <h4 className="modal-sec-title">
                  <Icons.Ring size={16} /> Accesorios
                </h4>
                <div className="modal-grid">
                  <NumField
                    label="Costo de la argolla"
                    prefix="₡"
                    value={config.accessories.ring}
                    onChange={onRing}
                    hint="Se suma por pieza cuando se selecciona argolla"
                  />
                </div>
              </section>

              <section className="modal-section">
                <h4 className="modal-sec-title">
                  <Icons.Bag size={16} /> Empaques
                </h4>
                <div className="modal-grid">
                  <NumField label="Bolsa pequeña" prefix="₡" value={config.packaging.small} onChange={(v) => onPack("small", v)} />
                  <NumField label="Bolsa mediana" prefix="₡" value={config.packaging.medium} onChange={(v) => onPack("medium", v)} />
                  <NumField label="Bolsa grande" prefix="₡" value={config.packaging.large} onChange={(v) => onPack("large", v)} />
                </div>
              </section>

              <section className="modal-section">
                <h4 className="modal-sec-title">
                  <Icons.Layers size={16} /> Márgenes de ganancia
                </h4>
                <div className="modal-grid">
                  {config.margins.map((tier, idx) => (
                    <NumField
                      key={MARGIN_TIER_LABELS[idx]}
                      label={MARGIN_TIER_LABELS[idx]}
                      suffix="%"
                      value={Math.round(tier.value * 100)}
                      onChange={(v) => onMargin(idx, v)}
                    />
                  ))}
                </div>
              </section>

              <section className="modal-section">
                <h4 className="modal-sec-title">
                  <Icons.Tag size={16} /> Precio mínimo
                </h4>
                <div className="modal-grid">
                  <NumField
                    label="Precio mínimo por pieza"
                    prefix="₡"
                    value={config.minimumPrice}
                    onChange={onMinimum}
                    hint="Evita cobrar de menos en piezas pequeñas"
                  />
                </div>
              </section>
            </div>

            <div className="modal-foot">
              <button type="button" className="btn-ghost" onClick={onReset}>
                <Icons.Refresh size={15} /> Restaurar valores iniciales
              </button>
              <button type="button" className="btn-p" onClick={onClose}>
                Listo
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}