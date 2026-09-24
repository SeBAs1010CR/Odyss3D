"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  Factory,
  Package,
  PackageCheck,
  PiggyBank,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { fetchStatistics } from "@/lib/admin/api";
import { STAT_RANGES, STATUSES } from "@/lib/admin/constants";
import { formatMoney } from "@/lib/admin/format";
import type { StatisticsData } from "@/lib/admin/types";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatCard } from "@/components/admin/StatCard";
import { Card, EmptyState, LoadingBlock } from "@/components/admin/ui";
import { cn } from "@/lib/admin/utils";

type RangeId = "week" | "month" | "3months" | "year";

export default function StatisticsPage() {
  const [range, setRange] = useState<RangeId>("month");
  const [data, setData] = useState<StatisticsData | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async (r: RangeId) => {
    setData(null);
    try {
      setData(await fetchStatistics(r));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar las estadísticas.");
    }
  }, []);

  useEffect(() => {
    load(range);
  }, [range, load]);

  const max = Math.max(...(data?.chart ?? []).map((d) => d.value), 1);

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">Estadísticas</h1>
          <p className="admin-page-sub">Ventas, ganancias y actividad del negocio</p>
        </div>
        <div className="admin-page-actions">
          <div className="filter-tabs">
            {STAT_RANGES.map((r) => (
              <button
                key={r.id}
                className={cn("filter-tab", range === r.id && "active")}
                onClick={() => setRange(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="error-text" style={{ marginBottom: 14 }}>{error}</p>}

      {!data ? (
        <LoadingBlock />
      ) : (
        <>
          <div className="stat-grid">
            <StatCard icon={<TrendingUp />} color="#0066ff" label="Ventas" value={`₡${formatMoney(data.sales)}`} />
            <StatCard icon={<PiggyBank />} color="#22c55e" label="Ganancias (bruto)" value={`₡${formatMoney(data.profit)}`} />
            <StatCard icon={<TrendingUp />} color="#4ade80" label="Ganancia neta" value={`₡${formatMoney(data.profit - data.machine_fund)}`} />
            <StatCard icon={<Factory />} color="#f59e0b" label="Mantenimiento" value={`₡${formatMoney(data.machine_fund)}`} />
            <StatCard icon={<Package />} color="#f59e0b" label="Pedidos" value={data.orders_count} />
            <StatCard icon={<PackageCheck />} color="#a855f7" label="Productos vendidos" value={data.products_sold} />
            <StatCard icon={<UserPlus />} color="#3b82f6" label="Clientes nuevos" value={data.new_customers} />
          </div>

          <div className="detail-grid">
            <Card title="Ventas del período">
              {data.chart.length === 0 ? (
                <EmptyState icon={<BarChart3 />} title="Sin ventas" text="Aún no hay ventas en este período." />
              ) : (
                <div className="chart-bars">
                  {data.chart.map((d, i) => (
                    <div className="chart-bar-col" key={`${d.label}-${i}`} title={`${d.label}: ₡${formatMoney(d.value)}`}>
                      <span className="chart-bar-label" style={{ color: d.value > 0 ? "var(--a-text)" : "transparent" }}>
                        {d.value > 0 ? `₡${formatMoney(d.value)}` : "·"}
                      </span>
                      <div
                        className={cn("chart-bar", d.value === 0 && "empty")}
                        style={{ height: `${Math.max(3, (d.value / max) * 100)}%` }}
                      />
                      <span className="chart-bar-label">{d.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Pedidos por estado">
              {data.by_status.length === 0 ? (
                <p className="table-muted">Sin pedidos en este período.</p>
              ) : (
                <div className="chart-legend" style={{ marginTop: 0, borderTop: "none", paddingTop: 0, flexDirection: "column", alignItems: "flex-start" }}>
                  {STATUSES.map((s) => {
                    const count = data.by_status.find((b) => b.status === s.id)?.count ?? 0;
                    return (
                      <div key={s.id} className="chart-legend-item" style={{ justifyContent: "space-between", width: "100%" }}>
                        <StatusBadge status={s.id} />
                        <strong style={{ color: "var(--a-text)" }}>{count}</strong>
                      </div>
                    );
                  })}
                  <div className="chart-legend-item" style={{ justifyContent: "space-between", width: "100%", borderTop: "1px solid var(--a-border)", paddingTop: 12 }}>
                    <span>Total</span>
                    <strong style={{ color: "var(--a-text)" }}>{data.orders_count}</strong>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </>
  );
}