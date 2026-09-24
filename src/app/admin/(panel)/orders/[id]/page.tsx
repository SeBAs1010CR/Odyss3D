"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import {
  addOrderImage,
  deleteOrder,
  fetchAccessories,
  fetchCustomers,
  fetchFilamentColors,
  fetchOrder,
  fetchSettings,
  fetchStaff,
  removeOrderImage,
  updateOrderFull,
} from "@/lib/admin/api";
import { PAYMENT_METHODS, STATUSES, TRANSPORT_TYPES } from "@/lib/admin/constants";
import { formatDate, formatDateTime, formatMoney, padNumber, toNum } from "@/lib/admin/format";
import { machineFund, netProfit } from "@/lib/admin/pricing";
import type {
  Accessory,
  Customer,
  FilamentColor,
  Order,
  OrderStatus,
  SettingsRecord,
} from "@/lib/admin/types";
import { createId } from "@/lib/admin/utils";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AccessoryPicker } from "@/components/admin/AccessoryPicker";
import { ColorPicker } from "@/components/admin/ColorPicker";
import { UploadManager, type ManagedImage } from "@/components/admin/UploadManager";
import { Btn, Card, ConfirmDialog, Field, Input, InputMoney, LoadingBlock, SelectBox, TextArea } from "@/components/admin/ui";

type RowItem = {
  key: string;
  product_id: string | null;
  name: string;
  quantity: string;
  unit_price: string;
  production_cost: string;
  colors: string[];
};

const money = (v: string): number => toNum(v);

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<Record<string, string>>({});
  const [colors, setColors] = useState<FilamentColor[]>([]);
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [settings, setSettings] = useState<SettingsRecord>({});
  const [error, setError] = useState("");
  const [meta, setMeta] = useState({
    status: "pendiente" as OrderStatus,
    customer_id: "",
    order_date: "",
    estimated_delivery: "",
    payment_method: "",
    transport_type: "",
    delivery_address: "",
    transport_cost: "",
    notes: "",
  });
  const [items, setItems] = useState<RowItem[]>([]);
  const [accessoryQtys, setAccessoryQtys] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const [o, c, staffMap, cl, ac, s] = await Promise.all([
      fetchOrder(params.id),
      fetchCustomers(),
      fetchStaff(),
      fetchFilamentColors(),
      fetchAccessories(),
      fetchSettings(),
    ]);
    if (o) {
      setOrder(o);
      setMeta({
        status: o.status,
        customer_id: o.customer_id ?? "",
        order_date: o.order_date,
        estimated_delivery: o.estimated_delivery ?? "",
        payment_method: o.payment_method ?? "",
        transport_type: o.transport_type ?? "",
        delivery_address: o.delivery_address ?? "",
        transport_cost: o.transport_cost ? String(o.transport_cost) : "",
        notes: o.notes ?? "",
      });
      setItems((o.items ?? []).map((it) => ({
        key: createId(),
        product_id: it.product_id,
        name: it.name,
        quantity: String(it.quantity),
        unit_price: String(it.unit_price),
        production_cost: it.production_cost != null ? String(it.production_cost) : "",
        colors: [...(it.colors ?? [])],
      })));
    }
    setCustomers(c);
    setStaff(staffMap);
    setColors(cl);
    setAccessories(ac);
    setSettings(s);
  }, [params.id]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  const updateItem = (key: string, patch: Partial<RowItem>) =>
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const toggleColor = (key: string, name: string) => {
    setItems((prev) => prev.map((i) => {
      if (i.key !== key) return i;
      const has = i.colors.includes(name);
      return { ...i, colors: has ? i.colors.filter((c) => c !== name) : [...i.colors, name] };
    }));
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
    const transport = money(meta.transport_cost);
    return {
      count: rows.reduce((s, r) => s + r.qty, 0),
      total: rows.reduce((s, r) => s + r.line, 0),
      profit: rows.reduce((s, r) => s + r.profit, 0),
      accQty: accRows.reduce((s, r) => s + r.qty, 0),
      accTotal: accRows.reduce((s, r) => s + r.line, 0),
      transport,
      grand: rows.reduce((s, r) => s + r.line, 0) + accRows.reduce((s, r) => s + r.line, 0) + transport,
    };
  }, [items, accessoryQtys, accessoryById, meta.transport_cost]);

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setSaving(true);
    setSaved(false);
    setError("");
    try {
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
      if (cleanItems.some((i) => i.unit_price <= 0)) {
        setError("Todos los productos deben tener un precio unitario.");
        setSaving(false);
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

      await updateOrderFull(order.id, {
        customer_id: meta.customer_id || order.customer_id || "",
        status: meta.status,
        order_date: meta.order_date || order.order_date,
        estimated_delivery: meta.estimated_delivery || null,
        payment_method: meta.payment_method || null,
        transport_type: meta.transport_type || null,
        delivery_address: meta.delivery_address.trim() || null,
        transport_cost: money(meta.transport_cost),
        notes: meta.notes || null,
        items: cleanItems,
        accessories: cleanAccessories,
      });
      setSaved(true);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  const onConfirmDelete = async () => {
    if (!order) return;
    setDeleting(true);
    try {
      await deleteOrder(order.id);
      router.replace("/admin/orders");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const onAddImages = async (paths: string[]) => {
    if (!order) return;
    for (const path of paths) {
      await addOrderImage(order.id, path);
    }
    setSaved(true);
    await load();
  };

  const onRemoveImage = async (image: ManagedImage) => {
    await removeOrderImage(image);
    setSaved(true);
    await load();
  };

  if (error && !order) return <div className="error-text">{error}</div>;
  if (!order) return <LoadingBlock />;

  const profit = totals.profit;
  const mf = machineFund(profit, settings);
  const net = netProfit(profit, settings);

  return (
    <>
      <div className="admin-page-head">
        <div>
          <div className="kv-row" style={{ marginBottom: 6 }}>
            <Btn variant="ghost" size="sm" onClick={() => router.push("/admin/orders")}>
              <ArrowLeft /> Pedidos
            </Btn>
          </div>
          <h1 className="admin-page-title">Pedido {padNumber(toNum(order.number))}</h1>
          <p className="admin-page-sub">
            Creado por <strong>{staff[order.created_by ?? ""] || "—"}</strong>
            {order.updated_by && order.updated_by !== order.created_by && (
              <> · Última modificación: <strong>{staff[order.updated_by] || "—"}</strong></>
            )}
            {" · "}Creado el {formatDateTime(order.created_at)}
          </p>
        </div>
        <div className="admin-page-actions">
          <span className="detail-status"><StatusBadge status={order.status} /></span>
          <Btn variant="danger" onClick={() => setConfirmDelete(true)}>
            <Trash2 /> Eliminar
          </Btn>
        </div>
      </div>

      {saved && <p className="success-text" style={{ marginBottom: 14 }}>Cambios guardados.</p>}
      {error && <p className="error-text" style={{ marginBottom: 14 }}>{error}</p>}

      <div className="detail-grid" style={{ marginTop: 20 }}>
        {/* DATOS Y EDICIÓN */}
        <form onSubmit={onSave} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card title="Datos del pedido" actions={<Btn type="submit" size="sm" loading={saving}><Save /> Guardar cambios</Btn>}>
            <div className="detail-meta">
              <Field label="Cliente">
                <SelectBox value={meta.customer_id} onChange={(e) => setMeta({ ...meta, customer_id: e.target.value })}>
                  <option value="">Sin cliente</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </SelectBox>
              </Field>
              <Field label="Estado">
                <SelectBox value={meta.status} onChange={(e) => setMeta({ ...meta, status: e.target.value as OrderStatus })}>
                  {STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </SelectBox>
              </Field>
              <Field label="Fecha">
                <Input type="date" value={meta.order_date} onChange={(e) => setMeta({ ...meta, order_date: e.target.value })} />
              </Field>
              <Field label="Fecha de entrega">
                <Input type="date" value={meta.estimated_delivery} onChange={(e) => setMeta({ ...meta, estimated_delivery: e.target.value })} />
              </Field>
              <Field label="Método de pago">
                <SelectBox value={meta.payment_method} onChange={(e) => setMeta({ ...meta, payment_method: e.target.value })}>
                  <option value="">Sin definir</option>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </SelectBox>
              </Field>
              <Field label="Notas">
                <TextArea value={meta.notes} onChange={(e) => setMeta({ ...meta, notes: e.target.value })} />
              </Field>
            </div>
          </Card>

          <Card
            title={`Productos (${totals.count})`}
            actions={
              <Btn type="button" variant="ghost" size="sm" onClick={addRow}>
                <Plus /> Agregar producto
              </Btn>
            }
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 4 }}>
              {items.map((item) => {
                const line = toNum(item.quantity) * money(item.unit_price);
                return (
                  <div className="line-item-card" key={item.key}>
                    <div className="line-item">
                      <Input
                        placeholder="Nombre del producto"
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
                      <InputMoney
                        placeholder="Costo prod."
                        suffix=""
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.production_cost}
                        onChange={(e) => updateItem(item.key, { production_cost: e.target.value })}
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
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title={`Accesorios${totals.accQty > 0 ? ` (${totals.accQty})` : ""}`}>
            <AccessoryPicker accessories={accessories} value={accessoryQtys} onChange={setAccessoryQtys} />
          </Card>

          <Card title="Envío y entrega">
            <div className="field-grid">
              <Field label="Transporte">
                <SelectBox value={meta.transport_type} onChange={(e) => setMeta({ ...meta, transport_type: e.target.value })}>
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
                  value={meta.transport_cost}
                  onChange={(e) => setMeta({ ...meta, transport_cost: e.target.value })}
                />
              </Field>
              <Field label="Dirección de entrega">
                <TextArea
                  placeholder="Provincia, cantón, señas…"
                  value={meta.delivery_address}
                  onChange={(e) => setMeta({ ...meta, delivery_address: e.target.value })}
                />
              </Field>
            </div>
          </Card>

          <Card title="Totales">
            <div className="order-summary-row">
              <span className="label">Productos</span>
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
                <span className="label">Transporte</span>
                <span className="value">₡{formatMoney(totals.transport)}</span>
              </div>
            )}
            <div className="order-summary-row">
              <span className="label">Total</span>
              <span className="order-total-big">₡{formatMoney(totals.grand)}</span>
            </div>
            <div className="order-summary-row">
              <span className="label">Ganancia estimada</span>
              <span className="value" style={{ color: "#4ade80" }}>₡{formatMoney(profit)}</span>
            </div>
            <div className="order-summary-row">
              <span className="label">Fondo de maquinaria ({settings.machine_fund_percent}%)</span>
              <span className="value" style={{ color: "#f59e0b" }}>−₡{formatMoney(mf)}</span>
            </div>
            <div className="order-summary-row">
              <span className="label">Ganancia neta</span>
              <span className="value" style={{ color: "#4ade80" }}>₡{formatMoney(net)}</span>
            </div>
          </Card>
        </form>

        {/* IMÁGENES Y RESUMEN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card title="Imágenes del pedido">
            <UploadManager
              bucket="orders"
              folder={order.id}
              images={(order.images ?? []).map((i) => ({ id: i.id, url: i.url }))}
              onAdd={onAddImages}
              onRemove={onRemoveImage}
              hint="Referencias, diseños, fotos del producto terminado o evidencia de entrega."
            />
          </Card>

          <Card title="Detalle del pedido">
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 10 }}>
              {items.filter((i) => i.name.trim()).map((it, idx) => (
                <div key={it.key} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: 8 }}>
                  <div className="kv-row" style={{ alignItems: "flex-start" }}>
                    <span>{idx + 1}. </span>
                    <strong style={{ textAlign: "right" }}>{it.quantity} × {it.name}</strong>
                  </div>
                  {it.colors.length > 0 && (
                    <div className="color-dots" style={{ marginTop: 4 }}>
                      {it.colors.map((c) => <span className="color-dot-name" key={c}>{c}</span>)}
                    </div>
                  )}
                </div>
              ))}
              {totals.accTotal > 0 && (
                <div className="kv-row" style={{ alignItems: "flex-start" }}>
                  <span>Accesorios</span>
                  <strong style={{ textAlign: "right", whiteSpace: "pre-wrap" }}>
                    {Object.entries(accessoryQtys)
                      .filter(([, q]) => q > 0)
                      .map(([id, q]) => `${q} × ${accessoryById.get(id)?.name ?? ""}`)
                      .join("\n")}
                  </strong>
                </div>
              )}
            </div>
          </Card>

          <Card title="Resumen">
            <div className="meta-item" style={{ marginBottom: 12 }}>
              <span className="meta-item-label">Cliente</span>
              <span className="meta-item-value">{customers.find((c) => c.id === meta.customer_id)?.name ?? order.customer?.name ?? "—"}</span>
              {order.customer?.whatsapp && (
                <span className="meta-item-value">{order.customer.whatsapp}</span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="kv-row"><span>Fecha</span><strong>{formatDate(order.order_date)}</strong></div>
              <div className="kv-row"><span>Fecha de entrega</span><strong>{formatDate(meta.estimated_delivery || order.estimated_delivery)}</strong></div>
              <div className="kv-row"><span>Método de pago</span><strong>{meta.payment_method || "—"}</strong></div>
              <div className="kv-row"><span>Transporte</span><strong>{meta.transport_type || "—"}</strong></div>
              {meta.delivery_address && (
                <div className="kv-row" style={{ alignItems: "flex-start" }}>
                  <span>Dirección</span>
                  <strong style={{ whiteSpace: "pre-wrap", textAlign: "right", maxWidth: 220 }}>{meta.delivery_address}</strong>
                </div>
              )}
              {meta.notes && (
                <div className="kv-row" style={{ alignItems: "flex-start" }}>
                  <span>Notas</span>
                  <strong style={{ whiteSpace: "pre-wrap", textAlign: "right" }}>{meta.notes}</strong>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Eliminar pedido"
        message={
          <>
            ¿Eliminar el pedido{" "}
            <strong>{padNumber(toNum(order.number))}</strong> de{" "}
            <strong>{order.customer?.name ?? "sin cliente"}</strong>? Esta acción no se puede deshacer.
          </>
        }
        busy={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}