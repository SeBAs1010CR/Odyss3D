import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXCLUDED_STATUSES = ["cancelado", "cotizacion", "entregado"];

function tomorrowUTC(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function getTransporter() {
  const host = process.env.MAIL_HOST;
  const port = Number(process.env.MAIL_PORT ?? 587);
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

const esc = (s: string | null | undefined): string =>
  (s ?? "").replace(/</g, "&lt;").replace(/\n/g, "<br/>");

function buildHtml(orders: any[]): string {
  return `
    <h3>Recordatorio de entregas del día de mañana — ODYSS3D</h3>
    <p>Tienes <strong>${orders.length}</strong> entrega${orders.length === 1 ? "" : "s"} programada${orders.length === 1 ? "" : "s"} para mañana:</p>
    <table style="border-collapse:collapse;width:100%;max-width:720px;font-size:13px" cellpadding="8" border="1" bordercolor="#ddd">
      <tr style="background:#f3f5f7">
        <th align="left">Pedido</th>
        <th align="left">Cliente</th>
        <th align="left">Productos</th>
        <th align="left">Entrega</th>
        <th align="left">Pago</th>
        <th align="left">Transporte / Dirección</th>
      </tr>
      ${orders
        .map((o) => {
          const items = (o.items ?? [])
            .map((i: any) => `${i.quantity} × ${esc(i.name)}`)
            .join(", ");
          const transport = [o.transport_type, o.delivery_address]
            .filter((v: string | null | undefined) => v)
            .join(" — ");
          return `<tr>
            <td><strong>#${String(o.number).padStart(4, "0")}</strong></td>
            <td>${esc(o.customer?.name)}${o.customer?.whatsapp ? `<br/><small>${esc(o.customer.whatsapp)}</small>` : ""}</td>
            <td>${esc(items) || "—"}</td>
            <td>${esc(o.estimated_delivery)}</td>
            <td>${esc(o.payment_method) || "—"}</td>
            <td>${esc(transport) || "—"}</td>
          </tr>`;
        })
        .join("")}
    </table>
    <p style="color:#666;font-size:12px">Revisa cada pedido para confirmar el estado antes de la entrega.</p>
  `;
}

const buildText = (orders: any[]): string =>
  [
    "Recordatorio de entregas del día de mañana — ODYSS3D",
    `Entregas programadas: ${orders.length}`,
    "",
    ...orders.map((o) => {
      const items = (o.items ?? [])
        .map((i: any) => `${i.quantity} × ${i.name}`)
        .join(", ");
      const transport = [o.transport_type, o.delivery_address].filter((v: string | null | undefined) => v).join(" — ");
      return `#${String(o.number).padStart(4, "0")} · ${o.customer?.name ?? "Sin cliente"}${o.customer?.whatsapp ? ` (${o.customer.whatsapp})` : ""} · ${items || "—"} · Entrega ${o.estimated_delivery} · Pago ${o.payment_method ?? "—"}${transport ? ` · ${transport}` : ""}`;
    }),
    "",
    "Revisa cada pedido para confirmar el estado antes de la entrega.",
  ].join("\n");

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const ua = request.headers.get("user-agent") ?? "";
    const auth = request.headers.get("authorization");
    const url = new URL(request.url);
    const ok =
      ua === "vercel-cron" ||
      auth === `Bearer ${cronSecret}` ||
      url.searchParams.get("secret") === cronSecret;
    if (!ok) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    return NextResponse.json({ error: "Servidor mal configurado" }, { status: 500 });
  }

  const tomorrow = tomorrowUTC();
  const supabase = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("orders")
    .select("*, customer:customers(name,whatsapp), items:order_items(name,quantity)")
    .eq("estimated_delivery", tomorrow)
    .not("status", "in", `(${EXCLUDED_STATUSES.join(",")})`)
    .order("number");

  if (error) {
    console.error("Recordatorio entregas:", error);
    return NextResponse.json({ error: "No se pudieron cargar los pedidos." }, { status: 500 });
  }

  const orders = data ?? [];
  let emailSent = false;

  const to = process.env.MAIL_TO || process.env.RESEND_TO;
  if (to && orders.length > 0) {
    try {
      if (process.env.RESEND_API_KEY) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const { error: sendError } = await resend.emails.send({
          from: process.env.RESEND_FROM ?? "onboarding@resend.dev",
          to,
          subject: `Entrega de mañana: ${orders.length} pedido(s) — ODYSS3D`,
          html: buildHtml(orders),
          text: buildText(orders),
        });
        if (sendError) throw sendError;
      } else {
        const transporter = getTransporter();
        if (transporter) {
          await transporter.sendMail({
            from: process.env.MAIL_FROM ?? process.env.MAIL_USER,
            to,
            subject: `Entrega de mañana: ${orders.length} pedido(s) — ODYSS3D`,
            html: buildHtml(orders),
            text: buildText(orders),
          });
        }
      }
      emailSent = true;
    } catch (err) {
      console.error("Error enviando recordatorio:", err);
    }
  }

  return NextResponse.json({
    ok: true,
    date: tomorrow,
    found: orders.length,
    emailSent,
  });
}