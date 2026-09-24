"use client";

import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useCart } from "@/lib/store/CartContext";
import { formatMoney } from "@/lib/calculator";

const PHONE = "50663959409";
const WHATSAPP_LINK = "https://wa.me/";

export function Cubo() {
  const { items, count, total, isOpen, open, close, setQty, remove, clear } = useCart();

  const orderMessage = encodeURIComponent(
    [
      "Hola ODYSS3D, quiero hacer este pedido:",
      ...items.map((it) => {
        const color = it.color ? ` (${it.color})` : "";
        const price = it.price != null ? ` ₡${formatMoney(it.price * it.qty)}` : "";
        return `• ${it.qty}x ${it.name}${color}${price}`;
      }),
      total > 0 ? `Total: ₡${formatMoney(total)}` : "",
      "",
      "¿Me confirman disponibilidad?",
    ]
      .filter(Boolean)
      .join("\n")
  );

  const waHref = `${WHATSAPP_LINK}${PHONE}?text=${orderMessage}`;

  return (
    <>
      {isOpen && <div className="cubo-backdrop" onClick={close} />}

      <div className={`cubo-panel ${isOpen ? "open" : ""}`} aria-hidden={!isOpen}>
        <div className="cubo-panel-head">
          <span className="cubo-panel-title">
            <ShoppingBag size={16} /> Tu cubo
          </span>
          <button className="cubo-close" onClick={close} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="cubo-empty">
            <div className="cubo-empty-cube">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <p>Tu cubo está vacío.<br /><small>Agrega productos para personalizarlo.</small></p>
          </div>
        ) : (
          <>
            <div className="cubo-items">
              {items.map((it) => (
                <div className="cubo-item" key={it.key}>
                  {it.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="cubo-item-img" src={it.image} alt={it.name} />
                  ) : (
                    <div className="cubo-item-thumb">
                      <ShoppingBag size={16} />
                    </div>
                  )}
                  <div className="cubo-item-info">
                    <div className="cubo-item-name">{it.name}</div>
                    {it.color && <div className="cubo-item-color">{it.color}</div>}
                    <div className="cubo-item-sub">
                      {it.price != null ? `₡${formatMoney(it.price)} c/u` : "Consultar"}
                    </div>
                    <div className="cubo-item-qty">
                      <button onClick={() => setQty(it.key, it.qty - 1)} aria-label="Restar">
                        <Minus size={13} />
                      </button>
                      <span>{it.qty}</span>
                      <button onClick={() => setQty(it.key, it.qty + 1)} aria-label="Sumar">
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="cubo-item-side">
                    <button className="cubo-remove" onClick={() => remove(it.key)} aria-label="Quitar">
                      <Trash2 size={15} />
                    </button>
                    <strong>{it.price != null ? `₡${formatMoney(it.price * it.qty)}` : ""}</strong>
                  </div>
                </div>
              ))}
            </div>

            <div className="cubo-panel-foot">
              <div className="cubo-total">
                <span>Total</span>
                <strong>₡{formatMoney(total)}</strong>
              </div>
              <a className="cubo-wa-btn" href={waHref} target="_blank" rel="noopener noreferrer" onClick={close}>
                Pedir por WhatsApp
              </a>
              <button className="cubo-clear" onClick={clear} type="button">
                Vaciar cubo
              </button>
            </div>
          </>
        )}
      </div>

      <button className="cubo-float" onClick={isOpen ? close : open} aria-label="Abrir tu cubo">
        <div className="cubo-cube">
          <span className="cubo-face cubo-front"><ShoppingBag size={18} /></span>
          <span className="cubo-face cubo-back"><ShoppingBag size={18} /></span>
          <span className="cubo-face cubo-right"><ShoppingBag size={18} /></span>
          <span className="cubo-face cubo-left"><ShoppingBag size={18} /></span>
          <span className="cubo-face cubo-top"><ShoppingBag size={18} /></span>
          <span className="cubo-face cubo-bottom"><ShoppingBag size={18} /></span>
        </div>
        {count > 0 && <span className="cubo-badge">{count}</span>}
        <span className="cubo-label">Tu cubo</span>
      </button>
    </>
  );
}