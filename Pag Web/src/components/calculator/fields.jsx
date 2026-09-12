export function NumberField({
  icon,
  label,
  hint,
  value,
  onChange,
  prefix,
  suffix,
  placeholder,
  big = false,
  className = "",
}) {
  return (
    <div className={`nf ${big ? "nf-big" : ""} ${className}`}>
      {(label || hint) && (
        <div className="nf-label">
          {label && (
            <span className="nf-label-text">
              {icon && <span className="nf-label-icon">{icon}</span>}
              {label}
            </span>
          )}
          {hint && <span className="nf-label-hint">{hint}</span>}
        </div>
      )}
      <div className="ti">
        {prefix && <span className="ti-prefix">{prefix}</span>}
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck="false"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        {suffix && <span className="ti-suffix">{suffix}</span>}
      </div>
    </div>
  )
}

export function Segmented({ options, value, onChange, size = "", className = "" }) {
  return (
    <div className={`seg ${size ? `seg-${size}` : ""} ${className}`} role="radiogroup">
      {options.map((opt) => (
        <button
          key={opt.id ?? opt.value}
          type="button"
          className={`seg-btn ${value === (opt.id ?? opt.value) ? "seg-on" : ""}`}
          onClick={() => onChange(opt.id ?? opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function ToggleRow({ icon, title, desc, checked, onChange, trailing }) {
  return (
    <button
      type="button"
      className={`tgl ${checked ? "tgl-on" : ""}`}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
    >
      <span className="tgl-icon">{icon}</span>
      <span className="tgl-body">
        <span className="tgl-title">{title}</span>
        {desc && <span className="tgl-desc">{desc}</span>}
      </span>
      {trailing}
      <span className="tgl-track" aria-hidden="true">
        <span className="tgl-thumb" />
      </span>
    </button>
  )
}

export function PackOption({ icon, title, price, active, onClick }) {
  return (
    <button type="button" className={`pack ${active ? "pack-on" : ""}`} onClick={onClick}>
      <span className="pack-radio" aria-hidden="true">
        {active && <span />}
      </span>
      <span className="pack-icon">{icon}</span>
      <span className="pack-body">
        <span className="pack-title">{title}</span>
        <span className="pack-price">{price}</span>
      </span>
    </button>
  )
}

export function MoneyRow({ icon, label, note, value }) {
  return (
    <div className="mrow">
      <span className="mrow-icon">{icon}</span>
      <div className="mrow-main">
        <span className="mrow-label">{label}</span>
        {note && <span className="mrow-note">{note}</span>}
      </div>
      <span className="mrow-value">{value}</span>
    </div>
  )
}