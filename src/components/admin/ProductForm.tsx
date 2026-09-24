"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Save, Sparkles } from "lucide-react";
import {
  createFilamentColor,
  createProduct,
  fetchCalculatorConfig,
  fetchFilamentColors,
  updateProduct,
  type ProductInput,
} from "@/lib/admin/api";
import { PRODUCT_CATEGORIES } from "@/lib/admin/constants";
import { toNum } from "@/lib/admin/format";
import { computeProductPricing, type ProductPricingResult } from "@/lib/admin/productAutoPricing";
import type { CalculatorSharedSettings, FilamentColor, Product } from "@/lib/admin/types";
import { createId } from "@/lib/admin/utils";
import { Btn, Card, Field, Input, InputMoney, TextArea } from "@/components/admin/ui";
import { ColorPicker } from "@/components/admin/ColorPicker";

export function ProductForm({
  product,
  onSaved,
}: {
  product?: Product | null;
  onSaved: (id: string) => void;
}) {
  const [form, setForm] = useState({
    name: product?.name ?? "",
    description: product?.description ?? "",
    category: product?.category ?? "",
    print_minutes: product?.print_minutes != null ? String(product.print_minutes) : "",
    grams: product?.grams != null ? String(product.grams) : "",
    production_cost: product?.production_cost != null ? String(product.production_cost) : "",
    sale_price: product?.sale_price != null ? String(product.sale_price) : "",
    is_active: product?.is_active ?? true,
    is_ecommerce: product?.is_ecommerce ?? false,
    colors: [...(product?.colors ?? [])],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [colorInput, setColorInput] = useState("");
  const [colorHex, setColorHex] = useState("#0066ff");
  const [colorsList, setColorsList] = useState<FilamentColor[]>([]);
  const [pricing, setPricing] = useState<ProductPricingResult | null>(null);
  const [calcShared, setCalcShared] = useState<CalculatorSharedSettings | null>(null);

  useEffect(() => {
    fetchFilamentColors().then(setColorsList).catch(() => setColorsList([]));
    fetchCalculatorConfig().then(setCalcShared).catch(() => setCalcShared(null));
  }, []);

  const applyPricing = useCallback((r: ProductPricingResult) => {
    setForm((f) => ({
      ...f,
      production_cost: String(Math.round(r.productionCost)),
      sale_price: String(r.salePrice),
    }));
  }, []);

  useEffect(() => {
    const r = computeProductPricing(form.grams, form.print_minutes, calcShared);
    setPricing(r);
    if (r && !product) applyPricing(r);
  }, [form.grams, form.print_minutes, product, calcShared, applyPricing]);

  const toggleColor = (name: string) =>
    setForm((f) => ({
      ...f,
      colors: f.colors.includes(name)
        ? f.colors.filter((c) => c !== name)
        : [...f.colors, name],
    }));

  const addCustomColor = async () => {
    const name = colorInput.trim();
    if (!name) return;
    setError("");
    try {
      await createFilamentColor(name, colorHex);
      const list = await fetchFilamentColors();
      setColorsList(list);
      toggleColor(name);
      setColorInput("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo agregar el color.";
      if (colorsList.some((c) => c.name === name)) {
        toggleColor(name);
        setColorInput("");
      } else {
        setError(message);
      }
    }
  };

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("El nombre del producto es obligatorio.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const input: ProductInput = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category.trim() || null,
        image: product?.image ?? null,
        print_minutes: form.print_minutes !== "" ? toNum(form.print_minutes) : null,
        grams: form.grams !== "" ? toNum(form.grams) : null,
        production_cost: form.production_cost !== "" ? toNum(form.production_cost) : null,
        sale_price: form.sale_price !== "" ? toNum(form.sale_price) : null,
        is_active: form.is_active,
        is_ecommerce: form.is_ecommerce,
        colors: form.colors,
      };

      if (product) {
        await updateProduct(product.id, input);
        onSaved(product.id);
      } else {
        const created = await createProduct(input, createId());
        onSaved(created.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el producto.");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <Card title={product ? "Editar producto" : "Nuevo producto"} actions={<Btn type="submit" size="sm" loading={saving}><Save /> Guardar</Btn>}>
        {error && <p className="error-text" style={{ marginBottom: 14 }}>{error}</p>}

        <div className="field-grid">
          <Field label="Nombre" required>
            <Input
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="Ej. Llavero personalizado"
              required
              autoFocus
            />
          </Field>

          <Field label="Categoría">
            <Input
              list="admin-product-categories"
              value={form.category}
              onChange={(e) => set({ category: e.target.value })}
              placeholder="Ej. Llaveros"
            />
            <datalist id="admin-product-categories">
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>

          <Field label="Descripción">
            <TextArea
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="Descripción interna del producto…"
            />
          </Field>

          <Field label="Tiempo de impresión (minutos)">
            <Input
              type="number"
              min={0}
              value={form.print_minutes}
              onChange={(e) => set({ print_minutes: e.target.value })}
              placeholder="Ej. 90"
            />
          </Field>

          <Field label="Gramos de filamento">
            <Input
              type="number"
              min={0}
              step="0.1"
              value={form.grams}
              onChange={(e) => set({ grams: e.target.value })}
              placeholder="Ej. 30"
            />
          </Field>

          <Field label="Costo de producción">
            <InputMoney
              type="number"
              min={0}
              step="0.01"
              value={form.production_cost}
              onChange={(e) => set({ production_cost: e.target.value })}
              placeholder="Se calcula con calc (mín. ₡400)"
            />
            {pricing && (
              <div className="field-hint">
                <Sparkles size={12} style={{ verticalAlign: -2 }} />{" "}
                Cálculo (calc): costo ₡{Math.round(pricing.productionCost)}
                {pricing.minCostApplied ? " (mínimo ₡400)" : ""} · venta sugerida ₡
                {pricing.salePrice} al {pricing.marginPercent}%
                {pricing.roundingApplied ? " · redondeado" : ""}
                {product && (
                  <button
                    type="button"
                    className="btn-app btn-app-ghost"
                    style={{ marginLeft: 8, padding: "3px 8px", fontSize: 11 }}
                    onClick={() => applyPricing(pricing)}
                  >
                    Aplicar
                  </button>
                )}
              </div>
            )}
          </Field>

          <Field label="Precio de venta">
            <InputMoney
              type="number"
              min={0}
              step="0.01"
              value={form.sale_price}
              onChange={(e) => set({ sale_price: e.target.value })}
              placeholder="Se calcula con calc (redondeo)"
            />
          </Field>

          <Field label="Colores (bolas de color)">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <ColorPicker colors={colorsList} selected={form.colors} onToggle={toggleColor} />
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <label
                  className="field-hint"
                  style={{ margin: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                  title="Abrir paleta de color"
                >
                  <input
                    type="color"
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value)}
                    style={{
                      width: 38,
                      height: 38,
                      padding: 2,
                      border: "1px solid var(--a-border)",
                      borderRadius: 8,
                      background: "transparent",
                      cursor: "pointer",
                    }}
                  />
                </label>
                <input
                  className="input"
                  style={{ flex: 1 }}
                  value={colorInput}
                  placeholder="Nombre del color (ej. Turquesa)…"
                  onChange={(e) => setColorInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void addCustomColor();
                    }
                  }}
                />
                <button type="button" className="btn-app btn-app-ghost" onClick={() => void addCustomColor()}>
                  Agregar
                </button>
              </div>
            </div>
            <p className="field-hint">Elige las bolas existentes, o crea un nuevo color con la paleta y el nombre (se guarda para usarlo en otros productos y pedidos).</p>
          </Field>

          <Field label="Tienda online">
            <label className="check-label" style={{ paddingTop: 6 }}>
              <input
                type="checkbox"
                checked={form.is_ecommerce}
                onChange={(e) => set({ is_ecommerce: e.target.checked })}
              />
              {form.is_ecommerce ? "Publicado en la tienda" : "Uso interno (fuera de la tienda)"}
            </label>
          </Field>

          {product && (
            <Field label="Estado">
              <label className="check-label" style={{ paddingTop: 6 }}>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => set({ is_active: e.target.checked })}
                />
                {form.is_active ? "Activo" : "Inactivo"}
              </label>
            </Field>
          )}
        </div>
      </Card>
    </form>
  );
}