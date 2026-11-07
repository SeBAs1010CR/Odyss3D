"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { useParams } from "next/navigation";
import { fetchOrder } from "@/lib/admin/api";
import { formatMoney, padNumber, toNum } from "@/lib/admin/format";
import type { Order } from "@/lib/admin/types";

export default function FacturaPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const facturaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchOrder(params.id)
      .then((o) => {
        if (!o) setError("Pedido no encontrado.");
        setOrder(o);
      })
      .catch((e) => setError(e.message));
  }, [params.id]);

  const downloadImage = async () => {
    if (!facturaRef.current || !order) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(facturaRef.current, {
        pixelRatio: 3,
        backgroundColor: "#ffffff",
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = `factura-${padNumber(toNum(order.number)).replace("#", "")}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  if (error) return <p style={{ padding: 16 }}>{error}</p>;
  if (!order) return <p style={{ padding: 16 }}>Cargando…</p>;

  const subtotal =
    (order.items ?? []).reduce((s, i) => s + Number(i.total), 0) +
    (order.accessories ?? []).reduce((s, a) => s + Number(a.total), 0);
  const transport = Number(order.transport_cost) || 0;
  const discountValue = Math.max(0, Math.round((subtotal - (Number(order.total) - transport)) * 100) / 100);

  return (
    <>
      <style>{`
        @page { size: 55mm auto; margin: 2mm; }
        html, body { background: #fff; color: #000; margin: 0; }
        .factura { width: 55mm; max-width: 55mm; margin: 0 auto; padding: 2mm 0;
          font-family: Arial, Helvetica, sans-serif; font-size: 10px; line-height: 1.35; }
        .factura img { width: 40mm; display: block; margin: 0 auto 2mm; }
        .factura h1 { font-size: 12px; text-align: center; margin: 0 0 2mm; }
        .factura .row { display: flex; justify-content: space-between; gap: 2mm; }
        .factura .label { font-weight: bold; }
        .factura .block { margin-top: 2mm; word-break: break-word; }
        .factura hr { border: 0; border-top: 1px dashed #000; margin: 2mm 0; }
        .factura .total { font-size: 12px; font-weight: bold; }
        .factura .legal { margin: 3mm 0 0; text-align: center; font-size: 9px; }
        .print-btn { display: block; margin: 12px auto; padding: 6px 12px; }
        @media print { .print-btn { display: none; } }
      `}</style>

      <div className="factura" ref={facturaRef}>
        <img src="/images/branding/logo-print.png" alt="ODYSS3D" />
        <h1>Pedido {padNumber(toNum(order.number))}</h1>

        <div className="row">
          <span className="label">Fecha</span>
          <span>{order.order_date}</span>
        </div>
        <div className="row">
          <span className="label">Cliente</span>
          <span>{order.customer?.name ?? "—"}</span>
        </div>
        <div className="row">
          <span className="label">Teléfono</span>
          <span>{order.customer?.whatsapp ?? "—"}</span>
        </div>
        <div className="row">
          <span className="label">Envío</span>
          <span>{order.transport_type || "—"}</span>
        </div>
        <div className="block">
          <span className="label">Ubicación</span>
          <div>{order.delivery_address || "—"}</div>
        </div>

        <hr />

        {(order.items ?? []).map((it) => (
          <div className="row" key={it.id}>
            <span>{it.quantity} x {it.name}</span>
            <span>{formatMoney(it.total)}</span>
          </div>
        ))}
        {(order.accessories ?? []).map((a) => (
          <div className="row" key={a.id}>
            <span>{a.quantity} x {a.name}</span>
            <span>{formatMoney(a.total)}</span>
          </div>
        ))}

        <hr />

        {discountValue > 0 && (
          <div className="row">
            <span>Subtotal</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
        )}
        {discountValue > 0 && (
          <div className="row">
            <span>
              Descuento{order.discount_percent ? ` (${order.discount_percent}%)` : ""}
            </span>
            <span>−{formatMoney(discountValue)}</span>
          </div>
        )}
        {transport > 0 && (
          <div className="row">
            <span>Envío</span>
            <span>{formatMoney(transport)}</span>
          </div>
        )}

        <div className="row total">
          <span>Total</span>
          <span>{formatMoney(order.total)}</span>
        </div>

        <p className="legal">
          <strong><em>No constituye factura ni comprobante electrónico tributario</em></strong>
        </p>
      </div>

      <button type="button" className="print-btn" onClick={downloadImage} disabled={downloading}>
        {downloading ? "Generando imagen…" : "Descargar imagen"}
      </button>
    </>
  );
}
