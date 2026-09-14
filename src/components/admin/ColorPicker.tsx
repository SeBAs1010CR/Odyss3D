"use client";

import { Check } from "lucide-react";
import type { FilamentColor } from "@/lib/admin/types";

type Props = {
  colors: FilamentColor[];
  selected: string[];
  onToggle: (name: string) => void;
};

export function ColorPicker({ colors, selected, onToggle }: Props) {
  if (colors.length === 0) {
    return (
      <p className="picker-muted">
        No tienes colores registrados — agrégalos en <strong>Configuración</strong>.
      </p>
    );
  }
  return (
    <div className="color-picker">
      {colors.map((c) => {
        const active = selected.includes(c.name);
        return (
          <button
            type="button"
            key={c.id}
            className={`color-chip ${active ? "active" : ""}`}
            onClick={() => onToggle(c.name)}
            title={c.name}
          >
            <span
              className="swatch"
              style={c.hex ? { backgroundColor: c.hex } : undefined}
            />
            <span className="color-chip-name">{c.name}</span>
            {active && <Check className="color-chip-check" />}
          </button>
        );
      })}
    </div>
  );
}