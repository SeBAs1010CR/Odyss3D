"use client";

import { Minus, Plus } from "lucide-react";
import { formatMoney } from "@/lib/admin/format";
import type { Accessory } from "@/lib/admin/types";

type Props = {
  accessories: Accessory[];
  value: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
};

export function AccessoryPicker({ accessories, value, onChange }: Props) {
  if (accessories.length === 0) {
    return (
      <p className="picker-muted">
        No tienes accesorios registrados — agrégalos en <strong>Configuración</strong>.
      </p>
    );
  }

  const setQty = (id: string, qty: number) => {
    const next = { ...value };
    if (qty <= 0) delete next[id];
    else next[id] = qty;
    onChange(next);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {accessories.map((a) => {
        const qty = value[a.id] ?? 0;
        return (
          <div className="acc-row" key={a.id}>
            <div className="acc-info">
              <span className="acc-name">{a.name}</span>
              {a.price > 0 && (
                <span className="acc-price">₡{formatMoney(a.price)} c/u</span>
              )}
            </div>
            <div className="acc-stepper">
              <button type="button" className="stepper-btn" onClick={() => setQty(a.id, qty - 1)} disabled={qty === 0}>
                <Minus />
              </button>
              <span className="stepper-qty">{qty}</span>
              <button type="button" className="stepper-btn" onClick={() => setQty(a.id, qty + 1)}>
                <Plus />
              </button>
            </div>
            {qty > 0 && (
              <span className="acc-subtotal">₡{formatMoney(qty * a.price)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}