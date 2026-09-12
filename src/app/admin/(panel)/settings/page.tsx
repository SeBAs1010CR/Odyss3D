"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Save } from "lucide-react";
import { fetchSettings, saveSettings } from "@/lib/admin/api";
import { SETTINGS_FIELDS } from "@/lib/admin/constants";
import { toNum } from "@/lib/admin/format";
import type { SettingsRecord } from "@/lib/admin/types";
import { Btn, Card, Field, InputMoney, LoadingBlock } from "@/components/admin/ui";

const groups = [
  { id: "costos", title: "Costos de producción" },
  { id: "margenes", title: "Márgenes por cantidad" },
  { id: "precios", title: "Precios" },
] as const;

const groupOf = (key: string): string => {
  if (key.startsWith("margin_")) return "margenes";
  if (key === "minimum_price") return "precios";
  return "costos";
};

export default function SettingsPage() {
  const [values, setValues] = useState<SettingsRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSettings().then((s) => setValues(s)).catch((e) => setError(e.message));
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

  if (!values && !error) return <LoadingBlock />;

  return (
    <form onSubmit={onSubmit}>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">Configuración</h1>
          <p className="admin-page-sub">Parámetros de costos, márgenes y precios del negocio</p>
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
      </div>
    </form>
  );
}

function settingsDefaults(): SettingsRecord {
  const out: SettingsRecord = {};
  for (const f of SETTINGS_FIELDS) out[f.key] = f.defaultValue;
  return out;
}