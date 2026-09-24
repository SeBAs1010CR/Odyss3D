"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Cpu,
  DollarSign,
  Landmark,
  Lightbulb,
  Sparkles,
  Wrench,
} from "lucide-react";
import { fetchPaymentsBreakdown } from "@/lib/admin/api";
import { STAT_RANGES } from "@/lib/admin/constants";
import { formatMoney, formatDateShort, padNumber, toNum } from "@/lib/admin/format";
import type { PaymentsData } from "@/lib/admin/types";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatCard } from "@/components/admin/StatCard";
import { Card, EmptyState, LoadingBlock } from "@/components/admin/ui";
import { cn } from "@/lib/admin/utils";

type RangeId = "week" | "month" | "3months" | "year";

export default function PaymentsPage() {
  const [range, setRange] = useState<RangeId>("month");
  const [data, setData] = useState<PaymentsData | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async (r: RangeId) => {
    setData(null);
    try {
      setData(await fetchPaymentsBreakdown(r));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los pagos.");
    }
  }, []);

  useEffect(() => {
    load(range);
  }, [range, load]);

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">Pagos y apartados</h1>
          <p className="admin-page-sub">Cuánto apartar de cada venta: filamento, luz, nuevas máquinas, mantenimiento y ganancia</p>
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
            <StatCard icon={<DollarSign />} color="#0066ff" label="Ventas" value={`₡${formatMoney(data.sales)}`} />
            <StatCard icon={<Sparkles />} color="#a855f7" label="Apartar: filamento" value={`₡${formatMoney(data.filament)}`} />
            <StatCard icon={<Lightbulb />} color="#f59e0b" label="Apartar: electricidad" value={`₡${formatMoney(data.electricity)}`} />
            <StatCard icon={<Wrench />} color="#ef4444" label="Apartar: nuevas máquinas" value={`₡${formatMoney(data.machine)}`} />
            <StatCard icon={<Landmark />} color="#3b82f6" label="Mantenimiento" value={`₡${formatMoney(data.machine_fund)}`} />
            <StatCard icon={<Cpu />} color="#22c55e" label="Ganancia neta" value={`₡${formatMoney(data.profit_net)}`} />
          </div>

          <Card title="Qué apartar de las ventas del período">
            {data.sales <= 0 ? (
              <EmptyState icon={<DollarSign />} title="Sin ventas" text="Aún no hay ventas en este período." />
            ) : (
              <div className="pay-buckets">
                <div className="pay-bucket">
                  <span className="pay-bucket-dot" style={{ background: "#a855f7" }} />
                  <div>
                    <strong>Filamento</strong>
                    <p>Para reponer el material usado en las piezas.</p>
                  </div>
                  <span className="pay-bucket-value">₡{formatMoney(data.filament)}</span>
                </div>
                <div className="pay-bucket">
                  <span className="pay-bucket-dot" style={{ background: "#f59e0b" }} />
                  <div>
                    <strong>Electricidad</strong>
                    <p>Para pagar la luz del tiempo de impresión.</p>
                  </div>
                  <span className="pay-bucket-value">₡{formatMoney(data.electricity)}</span>
                </div>
                <div className="pay-bucket">
                  <span className="pay-bucket-dot" style={{ background: "#ef4444" }} />
                  <div>
                    <strong>Nuevas máquinas</strong>
                    <p>Para adquirir nuevas impresoras (costo por hora de máquina).</p>
                  </div>
                  <span className="pay-bucket-value">₡{formatMoney(data.machine)}</span>
                </div>
                <div className="pay-bucket">
                  <span className="pay-bucket-dot" style={{ background: "#3b82f6" }} />
                  <div>
                    <strong>Mantenimiento</strong>
                    <p>Reserva del {Math.round((data.machine_fund / Math.max(data.profit, 1)) * 100)}% de la ganancia para mantenimiento y repuestos.</p>
                  </div>
                  <span className="pay-bucket-value">₡{formatMoney(data.machine_fund)}</span>
                </div>
                <div className="pay-bucket">
                  <span className="pay-bucket-dot" style={{ background: "#22c55e" }} />
                  <div>
                    <strong>Ganancia</strong>
                    <p>Lo que queda libre después de todos los apartados.</p>
                  </div>
                  <span className="pay-bucket-value">₡{formatMoney(data.profit_net)}</span>
                </div>
              </div>
            )}
          </Card>

          <Card title="Desglose por pedido" actions={<span className="table-muted">{data.orders.length} pedidos</span>}>
            {data.orders.length === 0 ? (
              <EmptyState icon={<DollarSign />} title="Sin pedidos" text="No hay pedidos con ventas en este período." />
            ) : (
              <>
                <div className="table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Fecha</th>
                        <th>Cliente</th>
                        <th>Estado</th>
                        <th className="table-right">Filamento</th>
                        <th className="table-right">Electricidad</th>
                        <th className="table-right">Máquina (nuevas)</th>
                        <th className="table-right">Total</th>
                        <th className="table-right">Ganancia neta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.orders.map((o) => (
                        <tr key={o.id}>
                          <td className="table-primary">{padNumber(toNum(o.number))}</td>
                          <td className="table-muted">{formatDateShort(o.order_date)}</td>
                          <td>{o.customer_name || "—"}</td>
                          <td><StatusBadge status={o.status} /></td>
                          <td className="table-right">₡{formatMoney(o.filament)}</td>
                          <td className="table-right">₡{formatMoney(o.electricity)}</td>
                          <td className="table-right">₡{formatMoney(o.machine)}</td>
                          <td className="table-strong table-right">₡{formatMoney(o.total)}</td>
                          <td className="table-right">₡{formatMoney(o.profit_net)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="field-hint" style={{ marginTop: 12 }}>
                  El desglose usa la configuración compartida de la calculadora (Configuración &gt; Calculadora).
                  Para piezas sin datos de gramos/tiempo, el costo se agrupa completo en “Máquina (nuevas)”.
                </p>
              </>
            )}
          </Card>
        </>
      )}
    </>
  );
}