"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { deleteOrder, fetchOrders } from "@/lib/admin/api";
import { STATUSES } from "@/lib/admin/constants";
import { formatMoney, formatDateShort, padNumber, toNum } from "@/lib/admin/format";
import type { Order } from "@/lib/admin/types";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Btn, ConfirmDialog, EmptyState, LoadingBlock } from "@/components/admin/ui";

const orderSummary = (o: Order): string =>
  (o.items ?? []).map((i) => `${i.quantity} × ${i.name}`).slice(0, 3).join(", ");

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [toDelete, setToDelete] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchOrders().then(setOrders).catch((e) => setError(e.message));
  }, []);

  const filtered = useMemo(() => {
    if (!orders) return [];
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (filter !== "all" && o.status !== filter) return false;
      if (!q) return true;
      const customer = (o.customer?.name ?? "").toLowerCase();
      return customer.includes(q) || String(o.number).includes(q) || `#${o.number}`.includes(q);
    });
  }, [orders, search, filter]);

  const onConfirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteOrder(toDelete.id);
      setOrders((prev) => (prev ?? []).filter((o) => o.id !== toDelete.id));
      setToDelete(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar.");
    } finally {
      setDeleting(false);
    }
  };

  if (error) return <div className="error-text">{error}</div>;
  if (!orders) return <LoadingBlock />;

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">Pedidos</h1>
          <p className="admin-page-sub">Gestiona todas las órdenes de producción</p>
        </div>
        <div className="admin-page-actions">
          <Link href="/admin/orders/new" className="btn-app btn-app-primary">
            <Plus /> Nuevo pedido
          </Link>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-wrap">
          <Search />
          <input
            className="input"
            placeholder="Buscar pedido o cliente…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="filter-tabs" style={{ marginBottom: 20 }}>
        <button className={`filter-tab ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
          Todos
        </button>
        {STATUSES.map((s) => (
          <button
            key={s.id}
            className={`filter-tab ${filter === s.id ? "active" : ""}`}
            onClick={() => setFilter(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Package />}
          title={orders.length === 0 ? "Sin pedidos todavía" : "Sin resultados"}
          text={
            orders.length === 0
              ? "Crea el primer pedido para empezar a organizar la producción."
              : "Ajusta la búsqueda o el filtro para encontrar lo que buscas."
          }
        />
      ) : (
        <>
          {/* Desktop: tabla */}
          <div className="table-wrap table-desktop">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Productos</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr
                    key={o.id}
                    className="table-row-click"
                    onClick={() => router.push(`/admin/orders/${o.id}`)}
                  >
                    <td className="table-primary">{padNumber(toNum(o.number))}</td>
                    <td>{o.customer?.name ?? "—"}</td>
                    <td className="table-muted">{orderSummary(o) || "—"}</td>
                    <td className="table-strong">₡{formatMoney(o.total)}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className="table-muted">{formatDateShort(o.order_date)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="table-actions">
                        <button className="icon-btn" onClick={() => router.push(`/admin/orders/${o.id}`)} title="Ver">
                          <Eye />
                        </button>
                        <button className="icon-btn" onClick={() => router.push(`/admin/orders/${o.id}`)} title="Editar">
                          <Pencil />
                        </button>
                        <button className="icon-btn danger" onClick={() => setToDelete(o)} title="Eliminar">
                          <Trash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: tarjetas */}
          <div className="cards-mobile">
            {filtered.map((o) => (
              <div className="mobile-order-card" key={o.id} onClick={() => router.push(`/admin/orders/${o.id}`)}>
                <div className="mobile-order-card-head">
                  <span className="table-primary">{padNumber(toNum(o.number))}</span>
                  <span className="mobile-order-card-total">₡{formatMoney(o.total)}</span>
                </div>
                <div className="mobile-order-card-meta">
                  <span>{o.customer?.name ?? "Sin cliente"}</span>
                  <span>·</span>
                  <span>{formatDateShort(o.order_date)}</span>
                </div>
                <div className="mobile-order-card-meta">{orderSummary(o) || "—"}</div>
                <div className="table-actions" style={{ justifyContent: "space-between" }}>
                  <StatusBadge status={o.status} />
                  <div className="table-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="icon-btn" onClick={() => router.push(`/admin/orders/${o.id}`)} title="Ver">
                      <Eye />
                    </button>
                    <button className="icon-btn danger" onClick={() => setToDelete(o)} title="Eliminar">
                      <Trash2 />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar pedido"
        message={
          <>
            ¿Eliminar el pedido{" "}
            <strong>{toDelete ? padNumber(toNum(toDelete.number)) : ""}</strong> de{" "}
            <strong>{toDelete?.customer?.name ?? "sin cliente"}</strong>? Esta acción no se puede deshacer.
          </>
        }
        busy={deleting}
        onCancel={() => setToDelete(null)}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}