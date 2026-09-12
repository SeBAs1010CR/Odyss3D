"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Save, Trash2 } from "lucide-react";
import { deleteCustomer, fetchCustomer, updateCustomer } from "@/lib/admin/api";
import { formatDate, formatMoney, padNumber, toNum } from "@/lib/admin/format";
import type { CustomerWithStats } from "@/lib/admin/types";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Btn, Card, ConfirmDialog, Field, Input, LoadingBlock, TextArea } from "@/components/admin/ui";

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [customer, setCustomer] = useState<CustomerWithStats | null>(null);
  const [error, setError] = useState("");
  const [saved, setSavingMsg] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ name: "", whatsapp: "", email: "", address: "", notes: "" });

  const load = useCallback(async () => {
    const c = await fetchCustomer(params.id);
    if (c) {
      setCustomer(c);
      setForm({
        name: c.name,
        whatsapp: c.whatsapp ?? "",
        email: c.email ?? "",
        address: c.address ?? "",
        notes: c.notes ?? "",
      });
    }
  }, [params.id]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setSavingMsg(false);
    setError("");
    try {
      await updateCustomer(params.id, {
        name: form.name.trim(),
        whatsapp: form.whatsapp.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
      });
      setSavingMsg(true);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  };

  const onConfirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteCustomer(params.id);
      router.replace("/admin/customers");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el cliente.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (error && !customer) return <div className="error-text">{error}</div>;
  if (!customer) return <LoadingBlock />;

  return (
    <>
      {saved && <p className="success-text" style={{ marginBottom: 14 }}>Cambios guardados.</p>}
      {error && <p className="error-text" style={{ marginBottom: 14 }}>{error}</p>}

      <div className="detail-grid">
        <form onSubmit={onSave} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card title="Información del cliente" actions={<Btn type="submit" size="sm" loading={busy}><Save /> Guardar</Btn>}>
            <div className="detail-meta">
              <Field label="Nombre">
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </Field>
              <Field label="WhatsApp">
                <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+506 1234 5678" />
              </Field>
              <Field label="Correo">
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
              <Field label="Dirección">
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </Field>
              <Field label="Notas">
                <TextArea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </Field>
            </div>
          </Card>

          <Card title="Historial de pedidos">
            {customer.orders.length === 0 ? (
              <p className="table-muted">Este cliente todavía no tiene pedidos.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {customer.orders.map((o) => (
                  <div
                    className="order-summary-row"
                    key={o.id}
                    onClick={() => router.push(`/admin/orders/${o.id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--a-text)" }}>
                        {padNumber(toNum(o.number))}
                        <span style={{ marginLeft: 10, fontWeight: 400, color: "var(--a-muted)", fontSize: 13 }}>
                          {formatDate(o.order_date)}
                        </span>
                      </div>
                      <div style={{ marginTop: 4 }}>
                        <StatusBadge status={o.status} />
                      </div>
                    </div>
                    <span className="value">₡{formatMoney(o.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </form>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card title="Resumen">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="kv-row"><span>Pedidos</span><strong>{customer.orders_count}</strong></div>
              <div className="kv-row"><span>Total comprado</span><strong>₡{formatMoney(customer.total_spent)}</strong></div>
              <div className="kv-row"><span>Último pedido</span><strong>{customer.last_order_at ? formatDate(customer.last_order_at) : "—"}</strong></div>
              <div className="kv-row"><span>Registro</span><strong>{formatDate(customer.created_at)}</strong></div>
            </div>
          </Card>

          <Card title="Acciones">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Btn variant="danger" onClick={() => setConfirmDelete(true)}>
                <Trash2 /> Eliminar cliente
              </Btn>
              <Btn variant="ghost" onClick={() => router.push(`/admin/orders/new`)}>
                <CheckCircle2 /> Crear pedido para este cliente
              </Btn>
            </div>
          </Card>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <Btn variant="ghost" size="sm" onClick={() => router.push("/admin/customers")}>
          <ArrowLeft /> Volver a clientes
        </Btn>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Eliminar cliente"
        message="Los clientes con pedidos asociados no pueden eliminarse. ¿Continuar?"
        busy={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}