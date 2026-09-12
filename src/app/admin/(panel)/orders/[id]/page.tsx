"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import {
  addOrderImage,
  deleteOrder,
  fetchCustomers,
  fetchOrder,
  fetchStaff,
  removeOrderImage,
  updateOrderMeta,
} from "@/lib/admin/api";
import { PAYMENT_METHODS, STATUSES } from "@/lib/admin/constants";
import { formatDate, formatDateTime, formatMoney, padNumber, toNum } from "@/lib/admin/format";
import type { Customer, Order, OrderStatus } from "@/lib/admin/types";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { UploadManager, type ManagedImage } from "@/components/admin/UploadManager";
import { Btn, Card, ConfirmDialog, Field, Input, LoadingBlock, SelectBox, TextArea } from "@/components/admin/ui";

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [meta, setMeta] = useState({
    status: "pendiente" as OrderStatus,
    customer_id: "",
    order_date: "",
    estimated_delivery: "",
    payment_method: "",
    notes: "",
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const [o, c, staffMap] = await Promise.all([
      fetchOrder(params.id),
      fetchCustomers(),
      fetchStaff(),
    ]);
    if (o) {
      setOrder(o);
      setMeta({
        status: o.status,
        customer_id: o.customer_id ?? "",
        order_date: o.order_date,
        estimated_delivery: o.estimated_delivery ?? "",
        payment_method: o.payment_method ?? "",
        notes: o.notes ?? "",
      });
    }
    setCustomers(c);
    setStaff(staffMap);
  }, [params.id]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await updateOrderMeta(order!.id, {
        status: meta.status,
        customer_id: meta.customer_id || order!.customer_id || undefined,
        order_date: meta.order_date || order!.order_date,
        estimated_delivery: meta.estimated_delivery || null,
        payment_method: meta.payment_method || null,
        notes: meta.notes || null,
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

  if (error) return <div className="error-text">{error}</div>;
  if (!order) return <LoadingBlock />;

  const totalItems = (order.items ?? []).reduce((s, i) => s + i.quantity, 0);
  const profit = (order.items ?? []).reduce(
    (s, i) => s + (i.unit_price - (i.production_cost ?? 0)) * i.quantity, 0
  );

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
          <Card title="Datos del pedido" actions={<Btn type="submit" size="sm" loading={saving}><Save /> Guardar</Btn>}>
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
              <Field label="Fecha estimada de entrega">
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

          <Card title={`Productos (${totalItems})`}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {(order.items ?? []).map((item) => (
                <div className="order-summary-row" key={item.id}>
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--a-text)" }}>
                      {item.quantity} × {item.name}
                    </div>
                    {item.production_cost != null && (
                      <div className="table-muted" style={{ fontSize: 12, marginTop: 2 }}>
                        costo: ₡{formatMoney(item.production_cost)}
                      </div>
                    )}
                  </div>
                  <span className="value">₡{formatMoney(item.total)}</span>
                </div>
              ))}
            </div>

            <div className="order-summary-row">
              <span className="label">Total</span>
              <span className="order-total-big">₡{formatMoney(order.total)}</span>
            </div>
            <div className="order-summary-row">
              <span className="label">Ganancia estimada</span>
              <span className="value" style={{ color: "#4ade80" }}>₡{formatMoney(profit || order.estimated_profit)}</span>
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

          <Card title="Resumen">
            <div className="meta-item" style={{ marginBottom: 12 }}>
              <span className="meta-item-label">Cliente</span>
              <span className="meta-item-value">{order.customer?.name ?? "—"}</span>
              {order.customer?.whatsapp && (
                <span className="meta-item-value">{order.customer.whatsapp}</span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="kv-row"><span>Fecha</span><strong>{formatDate(order.order_date)}</strong></div>
              <div className="kv-row"><span>Entrega estimada</span><strong>{formatDate(order.estimated_delivery)}</strong></div>
              <div className="kv-row"><span>Método de pago</span><strong>{order.payment_method ?? "—"}</strong></div>
              <div className="kv-row"><span>Productos</span><strong>{totalItems}</strong></div>
              {order.notes && (
                <div className="kv-row" style={{ alignItems: "flex-start" }}>
                  <span>Notas</span>
                  <strong style={{ whiteSpace: "pre-wrap", textAlign: "right" }}>{order.notes}</strong>
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