"use client";

import { useState, type FormEvent } from "react";
import { Save } from "lucide-react";
import { createProduct, updateProduct, type ProductInput } from "@/lib/admin/api";
import { PRODUCT_CATEGORIES } from "@/lib/admin/constants";
import { toNum } from "@/lib/admin/format";
import type { Product } from "@/lib/admin/types";
import { createId } from "@/lib/admin/utils";
import { Btn, Card, Field, Input, InputMoney, TextArea } from "@/components/admin/ui";

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
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
              placeholder="Ej. 850"
            />
          </Field>

          <Field label="Precio de venta">
            <InputMoney
              type="number"
              min={0}
              step="0.01"
              value={form.sale_price}
              onChange={(e) => set({ sale_price: e.target.value })}
              placeholder="Ej. 1200"
            />
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