import type { OrderStatus } from "@/lib/admin/types";
import { STATUS_LABEL } from "@/lib/admin/constants";
import { cn } from "@/lib/admin/utils";

const COLORS: Record<OrderStatus, string> = {
  cotizacion: "badge-slate",
  pendiente: "badge-amber",
  pago_pendiente: "badge-orange",
  en_produccion: "badge-yellow",
  listo: "badge-green",
  entregado: "badge-blue",
  cancelado: "badge-red",
};

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span className={cn("badge", COLORS[status] ?? "badge-slate", className)}>
      <span className="dot" />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}