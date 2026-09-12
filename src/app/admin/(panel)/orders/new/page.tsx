"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { createCustomer, createOrder, fetchCustomers, fetchProducts, type NewOrderInput } from "@/lib/admin/api";
import { PAYMENT_METHODS, STATUSES } from "@/lib/admin/constants";
import { formatMoney, toNum } from "@/lib/admin/format";
import type { Customer, OrderStatus, Product } from "@/lib/admin/types";
import { createId } from "@/lib/admin/utils";
import { Btn, Card, ConfirmDialog, Field, Input, InputMoney, LoadingBlock, Modal, SelectBox, TextArea } from "@/components/admin/ui";

type RowItem = {
  key: string;
  product_id: string | null;
  name: string;
  quantity: string;
  unit_price: string;
  production_cost: string;
};

const today = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const money = (v: string): number => toNum(v);

export default function NewOrderPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [customerId, setCustomerId] = useState("");
  const [status, setStatus] = useState<OrderStatus>("pendiente");
  const [orderDate, setOrderDate] = useState(today);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<RowItem[]>([
    { key: createId(), product_id: null, name: "", quantity: "1", unit_price: "", production_cost: "" },
  ]);

  const [customerModal, setCustomerModal] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: "", whatsapp: "", email: "", address: "", notes: "" });
  const [customerSaving, setCustomerSaving] = useState(false);

  useEffect(() => {
    Promise.all([fetchCustomers(), fetchProducts()])
      .then(([c, p]) => {
        setCustomers(c);
        setProducts(p);
        if (c.length === 1) setCustomerId(c[0].id);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const productById = useMemo(() => {
    const m = new Map<string, Product>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  const updateItem = (key: string, patch: Partial<RowItem>) =>
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const onSelectProduct = (key: string, productId: string) => {
    const p = productById.get(productId);
    updateItem(key, {
      product_id: productId || null,
      name: p ? p.name : "",
      unit_price: p ? String(p.sale_price ?? "") : "",
      production_cost: p ? String(p.production_cost ?? "") : "",
    });
  };

  const addRow = () => setItems((prev) => [
    ...prev,
    { key: createId(), product_id: null, name: "", quantity: "1", unit_price: "", production_cost: "" },
  ]);

  const removeRow = (key: string) => {
    if (items.length === 1) {
      setItems([{ key: createId(), product_id: null, name: "", quantity: "1", unit_price: "", production_cost: "" }]);
      return;
    }
    setItems((prev) => prev.filter((i) => i.key !== key));
  };

  const totals = useMemo(() => {
    const rows = items.map((i) => {
      const qty = Math.max(0, toNum(i.quantity, 0));
      const price = money(i.unit_price);
      const cost = money(i.production_cost);
      return { qty, price, cost, line: qty * price, profit: qty * (price - cost) };
    });
    return {
      count: rows.reduce((s, r) => s + r.qty, 0),
      total: rows.reduce((s, r) => s + r.line, 0),
      profit: rows.reduce((s, r) => s + r.profit, 0),
    };
  }, [items]);

  const onSaveCustomer = async (e: FormEvent) => {
    e.preventDefault();
    if (!customerForm.name.trim()) return;
    setCustomerSaving(true);
    try {
      const c = await createCustomer({
        name: customerForm.name.trim(),
        whatsapp: customerForm.whatsapp.trim() || null,
        email: customerForm.email.trim() || null,
        address: customerForm.address.trim() || null,
        notes: customerForm.notes.trim() || null,
      });
      setCustomers((prev) => [...prev, c]);
      setCustomerId(c.id);
      setCustomerModal(false);
      setCustomerForm({ name: "", whatsapp: "", email: "", address: "", notes: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el cliente.");
    } finally {
      setCustomerSaving(false);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setError("Selecciona un cliente para el pedido.");
      return;
    }
    const cleanItems = items
      .filter((i) => i.name.trim() && toNum(i.quantity) > 0)
      .map((i) => ({
        product_id: i.product_id,
        name: i.name.trim(),
        quantity: toNum(i.quantity),
        unit_price: money(i.unit_price),
        production_cost: i.production_cost.trim() !== "" ? money(i.production_cost) : null,
      }));
    if (cleanItems.length === 0) {
      setError("Agrega al menos un producto con cantidad.");
      return;
    }
    if (cleanItems.some((i) => i.unit_price <= 0)) {
      setError("Todos los productos deben tener un precio unitario.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const input: NewOrderInput = {
        customer_id: customerId,
        status,
        order_date: orderDate || today(),
        estimated_delivery: deliveryDate || null,
        payment_method: paymentMethod || null,
        notes: notes.trim() || null,
        items: cleanItems,
      };
      const order = await createOrder(input);
      router.push(`/admin/orders/${order.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el pedido.");
      setSaving(false);
    }
  };

  if (loading) return <LoadingBlock />;

  return (
    <form onSubmit={onSubmit}>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">Nuevo pedido</h1>
          <p className="admin-page-sub">Crea una orden de producción</p>
        </div>
        <div className="admin-page-actions">
          <Btn type="button" variant="ghost" onClick={() => router.back()}>
            <ArrowLeft /> Volver
          </Btn>
          <Btn type="submit" loading={saving}>
            <Save /> Guardar pedido
          </Btn>
        </div>
      </div>

      {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}

      <div className="form-grid">
        <Card title="Cliente">
          <div className="field-grid">
            <Field label="Cliente" required>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <SelectBox value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
                  <option value="">Seleccionar cliente…</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </SelectBox>
                <Btn type="button" variant="ghost" size="sm" onClick={() => setCustomerModal(true)}>
                  <Plus /> Nuevo cliente
                </Btn>
              </div>
            </Field>
          </div>
        </Card>

        <Card
          title="Productos"
          actions={
            <Btn type="button" variant="ghost" size="sm" onClick={addRow}>
              <Plus /> Agregar producto
            </Btn>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {items.map((item) => {
              const line = toNum(item.quantity) * money(item.unit_price);
              return (
                <div className="line-item" key={item.key}>
                  <SelectBox value={item.product_id ?? ""} onChange={(e) => onSelectProduct(item.key, e.target.value)}>
                    <option value="">Producto de catálogo…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </SelectBox>
                  <Input
                    placeholder="Nombre"
                    value={item.name}
                    onChange={(e) => updateItem(item.key, { name: e.target.value })}
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder="Cant."
                    value={item.quantity}
                    onChange={(e) => updateItem(item.key, { quantity: e.target.value })}
                  />
                  <InputMoney
                    placeholder="Precio unit."
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => updateItem(item.key, { unit_price: e.target.value })}
                  />
                  <span className="line-item-total">₡{formatMoney(line)}</span>
                  <button type="button" className="icon-btn danger line-item-remove" onClick={() => removeRow(item.key)} title="Quitar">
                    <Trash2 />
                  </button>
                </div>
              );
            })}

            <div className="order-summary-row">
              <span className="label">Total productos</span>
              <span className="value">₡{formatMoney(totals.total)}</span>
            </div>
          </div>
        </Card>

        <Card title="Datos del pedido">
          <div className="field-grid">
            <Field label="Estado">
              <SelectBox value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
                {STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </SelectBox>
            </Field>
            <Field label="Fecha">
              <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
            </Field>
            <Field label="Fecha estimada de entrega">
              <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
            </Field>
            <Field label="Método de pago">
              <SelectBox value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="">Sin definir</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </SelectBox>
            </Field>
            <Field label="Notas">
              <TextArea
                placeholder="Notas internas del pedido…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </div>
        </Card>
      </div>

      <Modal open={customerModal} title="Nuevo cliente" onClose={() => setCustomerModal(false)}>
        <form onSubmit={onSaveCustomer} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Nombre" required>
            <Input value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} required autoFocus />
          </Field>
          <Field label="WhatsApp">
            <Input value={customerForm.whatsapp} onChange={(e) => setCustomerForm({ ...customerForm, whatsapp: e.target.value })} placeholder="+506 1234 5678" />
          </Field>
          <Field label="Correo">
            <Input type="email" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} />
          </Field>
          <Field label="Dirección">
            <Input value={customerForm.address} onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })} />
          </Field>
          <Field label="Notas">
            <TextArea value={customerForm.notes} onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })} />
          </Field>
          <div className="modal-foot" style={{ marginTop: 0 }}>
            <Btn type="button" variant="ghost" onClick={() => setCustomerModal(false)}>Cancelar</Btn>
            <Btn type="submit" loading={customerSaving}>Guardar cliente</Btn>
          </div>
        </form>
      </Modal>
    </form>
  );
}