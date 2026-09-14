"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import {
  createAccessory,
  createFilamentColor,
  deleteAccessory,
  deleteFilamentColor,
  fetchAccessories,
  fetchFilamentColors,
  fetchSettings,
  saveSettings,
  updateAccessory,
} from "@/lib/admin/api";
import { SETTINGS_FIELDS } from "@/lib/admin/constants";
import { toNum } from "@/lib/admin/format";
import type { Accessory, FilamentColor } from "@/lib/admin/types";
import type { SettingsRecord } from "@/lib/admin/types";
import { Btn, Card, Field, Input, InputMoney, LoadingBlock } from "@/components/admin/ui";

const groups = [
  { id: "costos", title: "Costos de producción" },
  { id: "margenes", title: "Márgenes por cantidad" },
  { id: "precios", title: "Precios" },
  { id: "descuentos", title: "Descuentos por cantidad" },
  { id: "maquinaria", title: "Fondo de maquinaria" },
] as const;

const groupOf = (key: string): string => {
  if (key.startsWith("margin_")) return "margenes";
  if (key === "minimum_price") return "precios";
  if (key.startsWith("discount_") || key === "min_margin") return "descuentos";
  if (key === "machine_fund_percent") return "maquinaria";
  return "costos";
};

export default function SettingsPage() {
  const [values, setValues] = useState<SettingsRecord | null>(null);
  const [colors, setColors] = useState<FilamentColor[]>([]);
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [newColor, setNewColor] = useState({ name: "", hex: "" });
  const [newAccessory, setNewAccessory] = useState({ name: "", price: "", cost: "" });
  const [editingAcc, setEditingAcc] = useState<Record<string, { name: string; price: string; cost: string }>>({});

  useEffect(() => {
    Promise.all([fetchSettings(), fetchFilamentColors(), fetchAccessories()])
      .then(([s, c, a]) => {
        setValues(s);
        setColors(c);
        setAccessories(a);
      })
      .catch((e) => setError(e.message));
  }, []);

  const merged = useMemo<SettingsRecord>(() => {
    const base = { ...settingsDefaults() };
    if (values) Object.assign(base, values);
    return base;
  }, [values]);

  const setValue = (key: string, raw: string) =>
    setValues((prev) => ({ ...settingsDefaults(), ...(prev ?? {}), [key]: toNum(raw) }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      await saveSettings(merged);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron guardar los ajustes.");
    } finally {
      setSaving(false);
    }
  };

  const onAddColor = async () => {
    setError("");
    if (!newColor.name.trim()) return;
    try {
      await createFilamentColor(newColor.name, newColor.hex);
      setColors(await fetchFilamentColors());
      setNewColor({ name: "", hex: "" });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agregar el color.");
    }
  };

  const onRemoveColor = async (color: FilamentColor) => {
    setError("");
    try {
      await deleteFilamentColor(color.id);
      setColors((prev) => prev.filter((c) => c.id !== color.id));
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el color.");
    }
  };

  const onAddAccessory = async () => {
    setError("");
    if (!newAccessory.name.trim()) return;
    try {
      await createAccessory({
        name: newAccessory.name,
        price: toNum(newAccessory.price),
        cost: toNum(newAccessory.cost),
      });
      setAccessories(await fetchAccessories());
      setNewAccessory({ name: "", price: "", cost: "" });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agregar el accesorio.");
    }
  };

  const onSaveAccessory = async (a: Accessory) => {
    const draft = editingAcc[a.id];
    if (!draft) return;
    setError("");
    try {
      await updateAccessory(a.id, { name: draft.name, price: toNum(draft.price), cost: toNum(draft.cost) });
      setAccessories(await fetchAccessories());
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el accesorio.");
    }
  };

  const onRemoveAccessory = async (a: Accessory) => {
    setError("");
    try {
      await deleteAccessory(a.id);
      setAccessories((prev) => prev.filter((x) => x.id !== a.id));
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el accesorio.");
    }
  };

  if (!values && !error) return <LoadingBlock />;

  return (
    <form onSubmit={onSubmit}>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">Configuración</h1>
          <p className="admin-page-sub">Parámetros de costos, márgenes, precios, colores de filamento y accesorios</p>
        </div>
        <div className="admin-page-actions">
          <Btn type="submit" loading={saving}>
            <Save /> Guardar cambios
          </Btn>
        </div>
      </div>

      {saved && <p className="success-text" style={{ marginBottom: 14 }}>Ajustes guardados.</p>}
      {error && <p className="error-text" style={{ marginBottom: 14 }}>{error}</p>}

      <div className="form-grid">
        {groups.map((group) => {
          const fields = SETTINGS_FIELDS.filter((f) => groupOf(f.key) === group.id);
          if (fields.length === 0) return null;
          return (
            <Card key={group.id}>
              <div className="form-section-title">{group.title}</div>
              <div className="field-grid">
                {fields.map((f) => (
                  <Field key={f.key} label={f.label} hint={f.hint}>
                    <InputMoney
                      type="number"
                      step={f.step ?? "0.01"}
                      min={0}
                      suffix={f.suffix}
                      value={merged[f.key] ?? f.defaultValue}
                      onChange={(e) => setValue(f.key, e.target.value)}
                    />
                  </Field>
                ))}
              </div>
            </Card>
          );
        })}

        <Card title="Colores de filamento" actions={<span className="table-muted">{colors.length} colores</span>}>
          <div className="catalog-add-row">
            <Input
              placeholder="Nombre del color (ej. Negro)"
              value={newColor.name}
              onChange={(e) => setNewColor({ ...newColor, name: e.target.value })}
            />
            <div className="catalog-hex" style={{ position: "relative", width: 130 }}>
              <Input
                placeholder="#RRGGBB"
                value={newColor.hex}
                onChange={(e) => setNewColor({ ...newColor, hex: e.target.value })}
                style={newColor.hex ? { paddingLeft: 34 } : undefined}
              />
              <span
                className="hex-swatch"
                style={{
                  backgroundColor: /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(newColor.hex) ? newColor.hex : "#888",
                }}
              />
            </div>
            <Btn type="button" onClick={onAddColor}>
              <Plus /> Agregar
            </Btn>
          </div>
          <div className="catalog-list">
            {colors.length === 0 ? (
              <p className="picker-muted">Aún no tienes colores. Estos aparecerán en cada pedido para elegir.</p>
            ) : (
              colors.map((c) => (
                <div className="catalog-item" key={c.id}>
                  <span className="swatch-large" style={c.hex ? { backgroundColor: c.hex } : undefined} />
                  <span className="catalog-name">{c.name}</span>
                  <button type="button" className="icon-btn danger" onClick={() => onRemoveColor(c)} title="Eliminar">
                    <Trash2 />
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card title="Accesorios" actions={<span className="table-muted">argollas, stickers, bolsas…</span>}>
          <div className="catalog-add-row">
            <Input
              placeholder="Nombre (ej. Sticker 5 cm)"
              value={newAccessory.name}
              onChange={(e) => setNewAccessory({ ...newAccessory, name: e.target.value })}
            />
            <InputMoney
              placeholder="Precio"
              type="number"
              min={0}
              step="0.01"
              value={newAccessory.price}
              onChange={(e) => setNewAccessory({ ...newAccessory, price: e.target.value })}
            />
            <InputMoney
              placeholder="Costo"
              type="number"
              min={0}
              step="0.01"
              value={newAccessory.cost}
              onChange={(e) => setNewAccessory({ ...newAccessory, cost: e.target.value })}
            />
            <Btn type="button" onClick={onAddAccessory}>
              <Plus /> Agregar
            </Btn>
          </div>
          <div className="catalog-list">
            {accessories.length === 0 ? (
              <p className="picker-muted">Aún no tienes accesorios. Se ofrecerán en cada pedido.</p>
            ) : (
              accessories.map((a) => {
                const draft = editingAcc[a.id] ?? {
                  name: a.name,
                  price: String(a.price),
                  cost: String(a.cost),
                };
                const dirty = draft.name !== a.name || toNum(draft.price) !== a.price || toNum(draft.cost) !== a.cost;
                return (
                  <div className="catalog-item editable" key={a.id}>
                    <Input
                      value={draft.name}
                      onChange={(e) => setEditingAcc({ ...editingAcc, [a.id]: { ...draft, name: e.target.value } })}
                      style={{ flex: 1 }}
                    />
                    <InputMoney
                      placeholder="Precio"
                      type="number"
                      min={0}
                      step="0.01"
                      value={draft.price}
                      onChange={(e) => setEditingAcc({ ...editingAcc, [a.id]: { ...draft, price: e.target.value } })}
                    />
                    <InputMoney
                      placeholder="Costo"
                      type="number"
                      min={0}
                      step="0.01"
                      value={draft.cost}
                      onChange={(e) => setEditingAcc({ ...editingAcc, [a.id]: { ...draft, cost: e.target.value } })}
                    />
                    <Btn type="button" variant="ghost" size="sm" disabled={!dirty} onClick={() => onSaveAccessory(a)}>
                      Guardar
                    </Btn>
                    <button type="button" className="icon-btn danger" onClick={() => onRemoveAccessory(a)} title="Eliminar">
                      <Trash2 />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </form>
  );
}

function settingsDefaults(): SettingsRecord {
  const out: SettingsRecord = {};
  for (const f of SETTINGS_FIELDS) out[f.key] = f.defaultValue;
  return out;
}