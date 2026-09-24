"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import {
  createCustomer,
  createOrder,
  fetchAccessories,
  fetchCustomers,
  fetchFilamentColors,
  fetchProducts,
  fetchSettings,
  type NewOrderInput,
} from "@/lib/admin/api";
import { PAYMENT_METHODS, STATUSES, TRANSPORT_TYPES } from "@/lib/admin/constants";
import { formatMoney, toNum } from "@/lib/admin/format";
import { discountedPrice, discountPercent, machineFund, netProfit } from "@/lib/admin/pricing";
import type { Accessory, Customer, FilamentColor, OrderStatus, Product, SettingsRecord } from "@/lib/admin/types";
import { createId } from "@/lib/admin/utils";
import { AccessoryPicker } from "@/components/admin/AccessoryPicker";
import { ColorPicker } from "@/components/admin/ColorPicker";
import { Btn, Card, ConfirmDialog, Field, Input, InputMoney, LoadingBlock, Modal, SelectBox, TextArea } from "@/components/admin/ui";

type RowItem = {
  key: string;
  product_id: string | null;
  name: string;
  quantity: string;
  unit_price: string;
  production_cost: string;
  colors: string[];
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
  const [colors, setColors] = useState<FilamentColor[]>([]);
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [settings, setSettings] = useState<SettingsRecord>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [customerId, setCustomerId] = useState("");
  const [status, setStatus] = useState<OrderStatus>("pendiente");
  const [orderDate, setOrderDate] = useState(today);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [transportType, setTransportType] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [transportCost, setTransportCost] = useState("");
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<RowItem[]>([
    { key: createId(), product_id: null, name: "", quantity: "1", unit_price: "", production_cost: "", colors: [] },
  ]);

  const [accessoryQtys, setAccessoryQtys] = useState<Record<string, number>>({});

  const [customerModal, setCustomerModal] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: "", whatsapp: "", email: "", address: "", notes: "" });
  const [customerSaving, setCustomerSaving] = useState(false);

  useEffect(() => {
    Promise.all([fetchCustomers(), fetchProducts(), fetchFilamentColors(), fetchAccessories(), fetchSettings()])
      .then(([c, p, cl, ac, s]) => {
        setCustomers(c);
        setProducts(p);
        setColors(cl);
        setAccessories(ac);
        setSettings(s);
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
    const qty = toNum(items.find((i) => i.key === key)?.quantity ?? "1", 1);
    const price = p ? discountedPrice(qty, p.sale_price ?? 0, p.production_cost, settings) : 0;
    updateItem(key, {
      product_id: productId || null,
      name: p ? p.name : "",
      unit_price: p ? String(price) : "",
      production_cost: p ? String(p.production_cost ?? "") : "",
      colors: [],
    });
  };

  const onQtyChange = (item: RowItem, value: string) => {
    updateItem(item.key, { quantity: value });
    const p = item.product_id ? productById.get(item.product_id) : undefined;
    if (p) {
      const price = discountedPrice(toNum(value, 1), p.sale_price ?? 0, p.production_cost, settings);
      updateItem(item.key, { unit_price: String(price) });
    }
  };

  const addRow = () => setItems((prev) => [
    ...prev,
    { key: createId(), product_id: null, name: "", quantity: "1", unit_price: "", production_cost: "", colors: [] },
  ]);

  const removeRow = (key: string) => {
    if (items.length === 1) {
      setItems([{ key: createId(), product_id: null, name: "", quantity: "1", unit_price: "", production_cost: "", colors: [] }]);
      return;
    }
    setItems((prev) => prev.filter((i) => i.key !== key));
  };

  const toggleColor = (key: string, name: string) => {
    setItems((prev) => prev.map((i) => {
      if (i.key !== key) return i;
      const has = i.colors.includes(name);
      return { ...i, colors: has ? i.colors.filter((c) => c !== name) : [...i.colors, name] };
    }));
  };

  const accessoryById = useMemo(() => {
    const m = new Map<string, Accessory>();
    for (const a of accessories) m.set(a.id, a);
    return m;
  }, [accessories]);

  const totals = useMemo(() => {
    const rows = items.map((i) => {
      const qty = Math.max(0, toNum(i.quantity, 0));
      const price = money(i.unit_price);
      const cost = money(i.production_cost);
      return { qty, price, cost, line: qty * price, profit: qty * (price - cost) };
    });
    const accRows = Object.entries(accessoryQtys).map(([id, qty]) => {
      const a = accessoryById.get(id);
      return { qty, price: a?.price ?? 0, line: qty * (a?.price ?? 0) };
    });
    const transport = money(transportCost);
    const profit = rows.reduce((s, r) => s + r.profit, 0);
    return {
      count: rows.reduce((s, r) => s + r.qty, 0),
      total: rows.reduce((s, r) => s + r.line, 0),
      profit,
      mf: machineFund(profit, settings),
      net: netProfit(profit, settings),
      accQty: accRows.reduce((s, r) => s + r.qty, 0),
      accTotal: accRows.reduce((s, r) => s + r.line, 0),
      transport,
      grand: rows.reduce((s, r) => s + r.line, 0) + accRows.reduce((s, r) => s + r.line, 0) + money(transportCost),
    };
  }, [items, accessoryQtys, accessoryById, transportCost, settings]);

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
        colors: i.colors,
      }));
    if (cleanItems.length === 0) {
      setError("Agrega al menos un producto con cantidad.");
      return;
    }
    if (cleanItems.some((i) => i.unit_price <= 0)) {
      setError("Todos los productos deben tener un precio unitario.");
      return;
    }

    const cleanAccessories = Object.entries(accessoryQtys)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const a = accessoryById.get(id);
        return {
          accessory_id: id,
          name: a?.name ?? "",
          quantity: qty,
          unit_price: a?.price ?? 0,
        };
      })
      .filter((a) => a.name);

    setSaving(true);
    setError("");
    try {
      const input: NewOrderInput = {
        customer_id: customerId,
        status,
        order_date: orderDate || today(),
        estimated_delivery: deliveryDate || null,
        payment_method: paymentMethod || null,
        transport_type: transportType || null,
        delivery_address: deliveryAddress.trim() || null,
        transport_cost: money(transportCost),
        notes: notes.trim() || null,
        items: cleanItems,
        accessories: cleanAccessories,
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
            <div className="tier-info">
              El precio se calcula solo por cantidad:
              <strong> 1–20</strong> y <strong>{settings.discount_20}% </strong>(21–50) ·{" "}
              <strong>{settings.discount_50}%</strong> (51–100) · <strong>{settings.discount_100}%</strong> (101+).
              {" "}Nunca baja del <strong>{settings.min_margin}%</strong> de ganancia.
            </div>
            {items.map((item) => {
              const line = toNum(item.quantity) * money(item.unit_price);
              const catalog = item.product_id ? productById.get(item.product_id) : undefined;
              const base = catalog?.sale_price ?? 0;
              const disc = catalog ? discountPercent(toNum(item.quantity, 1), settings) : 0;
              return (
                <div className="line-item-card" key={item.key}>
                  <div className="line-item">
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
                      onChange={(e) => onQtyChange(item, e.target.value)}
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
                  <div className="line-item-colors">
                    <span className="line-item-colors-label">Colores</span>
                    <ColorPicker colors={colors} selected={item.colors} onToggle={(name) => toggleColor(item.key, name)} />
                  </div>
                  {catalog && base > 0 && disc > 0 && (
                    <p className="line-item-price-info">
                      Precio base ₡{formatMoney(base)} · descuento de {disc}% por cantidad
                    </p>
                  )}
                </div>
              );
            })}

            <div className="order-summary-row">
              <span className="label">Total productos</span>
              <span className="value">₡{formatMoney(totals.total)}</span>
            </div>
            {totals.accTotal > 0 && (
              <div className="order-summary-row">
                <span className="label">Accesorios ({totals.accQty})</span>
                <span className="value">₡{formatMoney(totals.accTotal)}</span>
              </div>
            )}
            {totals.transport > 0 && (
              <div className="order-summary-row">
                <span className="label">Transporte {transportType ? `— ${transportType}` : ""}</span>
                <span className="value">₡{formatMoney(totals.transport)}</span>
              </div>
            )}
            <div className="order-summary-row">
              <span className="label">Ganancia estimada</span>
              <span className="value" style={{ color: "#4ade80" }}>₡{formatMoney(totals.profit)}</span>
            </div>
            <div className="order-summary-row">
              <span className="label">Fondo de maquinaria ({settings.machine_fund_percent}%)</span>
              <span className="value" style={{ color: "#f59e0b" }}>−₡{formatMoney(totals.mf)}</span>
            </div>
            <div className="order-summary-row">
              <span className="label">Ganancia neta</span>
              <span className="value" style={{ color: "#4ade80" }}>₡{formatMoney(totals.net)}</span>
            </div>
            <div className="order-summary-row order-total-final">
              <span className="label">Total</span>
              <span className="value">₡{formatMoney(totals.grand)}</span>
            </div>
          </div>
        </Card>

        <Card
          title="Accesorios"
          actions={<span className="table-muted">{totals.accQty > 0 ? `${totals.accQty} artículos` : "opcional"}</span>}
        >
          <AccessoryPicker accessories={accessories} value={accessoryQtys} onChange={setAccessoryQtys} />
        </Card>

        <Card title="Envío y entrega">
          <div className="field-grid">
            <Field label="Transporte">
              <SelectBox value={transportType} onChange={(e) => setTransportType(e.target.value)}>
                <option value="">Sin definir</option>
                {TRANSPORT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </SelectBox>
            </Field>
            <Field label="Costo de transporte">
              <InputMoney
                type="number"
                min={0}
                step="0.01"
                value={transportCost}
                onChange={(e) => setTransportCost(e.target.value)}
              />
            </Field>
            <Field label="Dirección de entrega" hint="Omitir si es recogida en tienda">
              <Input
                placeholder="Provincia, cantón, señas…"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
              />
            </Field>
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
            <Field label="Fecha de entrega">
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