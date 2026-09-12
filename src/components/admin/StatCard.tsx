import type { ReactNode } from "react";

export function StatCard({
  icon,
  color,
  label,
  value,
  sub,
}: {
  icon: ReactNode;
  color: string;
  label: string;
  value: ReactNode;
  sub?: string;
}) {
  return (
    <div className="stat-card">
      <div
        className="stat-card-icon"
        style={{ background: `${color}1f`, color }}
      >
        {icon}
      </div>
      <div>
        <div className="stat-card-label">{label}</div>
        <div className="stat-card-value">{value}</div>
        {sub && (
          <div className="table-muted" style={{ fontSize: 12, marginTop: 4 }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}