import { formatCRC, formatMoney } from "@/lib/calculator";

export { formatCRC, formatMoney };

export const toNum = (v: unknown, fallback = 0): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};

export const padNumber = (n: number): string => `#${String(n).padStart(4, "0")}`;

export const parseDate = (d: string | null | undefined): Date | null => {
  if (!d) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T12:00:00`) : new Date(d);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDate = (d: string | null | undefined): string => {
  const date = parseDate(d);
  if (!date) return "—";
  return date.toLocaleDateString("es-CR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatDateShort = (d: string | null | undefined): string => {
  const date = parseDate(d);
  if (!date) return "—";
  return date.toLocaleDateString("es-CR", { day: "2-digit", month: "short" });
};

export const formatDateTime = (d: string | null | undefined): string => {
  const date = parseDate(d);
  if (!date) return "—";
  return date.toLocaleDateString("es-CR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatPercent = (v: number): string => `${Math.round(v * 10) / 10}%`;

export const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const startOfRange = (
  range: "week" | "month" | "3months" | "year"
): Date => {
  const now = new Date();
  if (range === "week") {
    const day = (now.getDay() + 6) % 7; // lunes = 0
    return startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - day));
  }
  if (range === "month") return startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
  if (range === "3months")
    return startOfDay(new Date(now.getFullYear(), now.getMonth() - 3, 1));
  return startOfDay(new Date(now.getFullYear(), 0, 1));
};