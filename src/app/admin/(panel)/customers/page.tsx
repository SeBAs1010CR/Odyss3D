"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, Plus, Search, Trash2, Users } from "lucide-react";
import { createCustomer, deleteCustomer, fetchCustomers, fetchOrders } from "@/lib/admin/api";
import { formatDate, formatMoney, toNum } from "@/lib/admin/format";
import type { Customer, Order } from "@/lib/admin/types";
import { Btn, ConfirmDialog, EmptyState, Field, Input, LoadingBlock, Modal, TextArea } from "@/components/admin/ui";

const NON_REVENUE = new Set(["cancelado", "cotizacion"]);

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [toDelete, setToDelete] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", whatsapp: "", email: "", address: "", notes: "" });

  useEffect(() => {
    Promise.all([fetchCustomers(), fetchOrders()])
      .then(([c, o]) => {
        setCustomers(c);
        setOrders(o);
      })
      .catch((e) => setError(e.message));
  }, []);

  const stats = useMemo(() => {
    const map: Record<string, { count: number; total: number; last: string | null }> = {};
    for (const o of orders) {
      if (!o.customer_id) continue;
      const m = map[o.customer_id] ?? { count: 0, total: 0, last: null };
      m.count += 1;
      if (!NON_REVENUE.has(o.status)) m.total += o.total;
      if (!m.last || o.created_at > m.last) m.last = o.created_at;
      map[o.customer_id] = m;
    }
    return map;
  }, [orders]);

  const filtered = useMemo(() => {
    if (!customers) return [];
    const q = search.trim().toLowerCase();
    return customers.filter((c) =>
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.whatsapp ?? "").includes(q) ||
      (c.email ?? "").toLowerCase().includes(q)
    );
  }, [customers, search]);

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const c = await createCustomer({
        name: form.name.trim(),
        whatsapp: form.whatsapp.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
      });
      setCustomers((prev) => (prev ? [...prev, c] : [c]));
      setModal(false);
      setForm({ name: "", whatsapp: "", email: "", address: "", notes: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el cliente.");
    } finally {
      setSaving(false);
    }
  };

  const onConfirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    setError("");
    try {
      await deleteCustomer(toDelete.id);
      setCustomers((prev) => (prev ?? []).filter((c) => c.id !== toDelete.id));
      setToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el cliente.");
    } finally {
      setDeleting(false);
    }
  };

  if (error && !customers) return <div className="error-text">{error}</div>;
  if (!customers) return <LoadingBlock />;

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">Clientes</h1>
          <p className="admin-page-sub">Contactos e historial de compras</p>
        </div>
        <div className="admin-page-actions">
          <Btn onClick={() => setModal(true)}>
            <Plus /> Nuevo cliente
          </Btn>
        </div>
      </div>

      {error && <p className="error-text" style={{ marginBottom: 14 }}>{error}</p>}

      <div className="filter-bar">
        <div className="search-wrap">
          <Search />
          <input
            className="input"
            placeholder="Buscar cliente…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title={customers.length === 0 ? "Sin clientes" : "Sin resultados"}
          text={customers.length === 0 ? "Registra tu primer cliente para empezar a crear pedidos." : "Prueba con otro término de búsqueda."}
        />
      ) : (
        <>
          <div className="table-wrap table-desktop">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contacto</th>
                  <th>Pedidos</th>
                  <th>Total comprado</th>
                  <th>Último pedido</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const s = stats[c.id];
                  return (
                    <tr key={c.id} className="table-row-click" onClick={() => router.push(`/admin/customers/${c.id}`)}>
                      <td className="table-primary">{c.name}</td>
                      <td className="table-muted">
                        {c.whatsapp ?? "—"}
                        {c.email && <div style={{ fontSize: 12 }}>{c.email}</div>}
                      </td>
                      <td>{s?.count ?? 0}</td>
                      <td className="table-strong">₡{formatMoney(s?.total ?? 0)}</td>
                      <td className="table-muted">{formatDate(s?.last ?? null)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="table-actions">
                          <button className="icon-btn" onClick={() => router.push(`/admin/customers/${c.id}`)} title="Ver">
                            <Eye />
                          </button>
                          <button className="icon-btn danger" onClick={() => setToDelete(c)} title="Eliminar">
                            <Trash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="cards-mobile">
            {filtered.map((c) => {
              const s = stats[c.id];
              return (
                <div className="mobile-order-card" key={c.id} onClick={() => router.push(`/admin/customers/${c.id}`)}>
                  <div className="mobile-order-card-head">
                    <span className="table-primary">{c.name}</span>
                    <span className="mobile-order-card-total">₡{formatMoney(s?.total ?? 0)}</span>
                  </div>
                  <div className="mobile-order-card-meta">
                    <span>{c.whatsapp ?? "Sin WhatsApp"}</span>
                    <span>·</span>
                    <span>{s?.count ?? 0} pedidos</span>
                  </div>
                  <div className="table-actions" style={{ justifyContent: "space-between" }}>
                    <span className="table-muted" style={{ fontSize: 12.5 }}>
                      Último pedido: {formatDate(s?.last ?? null)}
                    </span>
                    <div className="table-actions" onClick={(e) => e.stopPropagation()}>
                      <button className="icon-btn" onClick={() => router.push(`/admin/customers/${c.id}`)} title="Ver">
                        <Eye />
                      </button>
                      <button className="icon-btn danger" onClick={() => setToDelete(c)} title="Eliminar">
                        <Trash2 />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <Modal open={modal} title="Nuevo cliente" onClose={() => setModal(false)}>
        <form onSubmit={onSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Nombre" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
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
          <div className="modal-foot" style={{ marginTop: 0 }}>
            <Btn type="button" variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn type="submit" loading={saving}>Guardar cliente</Btn>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar cliente"
        message={
          <>
            ¿Eliminar a <strong>{toDelete?.name}</strong>? Los clientes con pedidos asociados no pueden eliminarse.
          </>
        }
        busy={deleting}
        onCancel={() => setToDelete(null)}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}