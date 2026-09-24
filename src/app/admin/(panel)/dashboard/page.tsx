"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Boxes,
  CheckCircle2,
  Clock,
  Factory,
  Hourglass,
  PiggyBank,
  Printer,
  TrendingUp,
  Users,
} from "lucide-react";
import { fetchDashboardData } from "@/lib/admin/api";
import { padNumber, formatMoney, formatDateShort, toNum } from "@/lib/admin/format";
import type { DashboardData, Order } from "@/lib/admin/types";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EmptyState, LoadingBlock } from "@/components/admin/ui";

const orderSummary = (o: Order): string => {
  const items = (o.items ?? []).map((i) => `${i.quantity} × ${i.name}`);
  return items.slice(0, 2).join(", ");
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setData(await fetchDashboardData());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al cargar el dashboard.");
      }
    })();
  }, []);

  if (error) return <div className="error-text">{error}</div>;
  if (!data) return <LoadingBlock />;

  const { counts } = data;

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">Dashboard</h1>
          <p className="admin-page-sub">Resumen del negocio ODYSS3D</p>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard
          icon={<Hourglass />}
          color="#f59e0b"
          label="Pedidos pendientes"
          value={counts.pendiente}
        />
        <StatCard
          icon={<Printer />}
          color="#eab308"
          label="En producción"
          value={counts.en_produccion}
        />
        <StatCard
          icon={<CheckCircle2 />}
          color="#22c55e"
          label="Listos"
          value={counts.listo}
        />
        <StatCard
          icon={<TrendingUp />}
          color="#0066ff"
          label="Ventas del mes"
          value={`₡${formatMoney(data.month_sales)}`}
        />
        <StatCard
          icon={<PiggyBank />}
          color="#22c55e"
          label="Ganancia estimada"
          value={`₡${formatMoney(data.month_profit)}`}
        />
        <StatCard
          icon={<TrendingUp />}
          color="#4ade80"
          label="Ganancia neta (mes)"
          value={`₡${formatMoney(data.month_profit - data.month_machine_fund)}`}
        />
        <StatCard
          icon={<Factory />}
          color="#f59e0b"
          label="Mantenimiento (mes)"
          value={`₡${formatMoney(data.month_machine_fund)}`}
        />
        <StatCard
          icon={<Users />}
          color="#3b82f6"
          label="Clientes"
          value={data.customers_count}
        />
        <StatCard
          icon={<Boxes />}
          color="#a855f7"
          label="Productos"
          value={data.products_count}
        />
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="card-head" style={{ padding: "18px 22px", marginBottom: 0 }}>
          <div className="card-title">Pedidos recientes</div>
          <Link href="/admin/orders" className="btn-app btn-app-ghost btn-app-sm">
            Ver todos
          </Link>
        </div>

        {data.recent_orders.length === 0 ? (
          <EmptyState
            icon={<Clock />}
            title="Sin pedidos todavía"
            text="Los pedidos nuevos aparecerán aquí en cuanto los crees."
          />
        ) : (
          <div className="table-desktop">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Productos</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_orders.map((o) => (
                  <tr key={o.id} className="table-row-click" onClick={() => (window.location.href = `/admin/orders/${o.id}`)}>
                    <td className="table-primary">{padNumber(toNum(o.number))}</td>
                    <td>{o.customer?.name ?? "—"}</td>
                    <td className="table-muted">{orderSummary(o) || "—"}</td>
                    <td className="table-strong">₡{formatMoney(o.total)}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className="table-muted">{formatDateShort(o.order_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}