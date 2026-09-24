import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { formatMoney } from "@/lib/calculator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Catálogo público del ecommerce.
 * Devuelve los productos activos con su imagen resuelta
 * (públicas en /images/… o firmadas si viven en Storage privado).
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Servidor mal configurado" }, { status: 500 });
  }

  const supabase = createServiceClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) {
    return NextResponse.json({ error: "No se pudo cargar el catálogo" }, { status: 500 });
  }

  const products = await Promise.all(
    (data ?? []).map(async (row) => {
      const rawImage = (row.image as string | null) ?? null;
      let image: string | null = null;

      if (rawImage) {
        if (/^https?:\/\//.test(rawImage) || rawImage.startsWith("/")) {
          image = rawImage;
        } else {
          const { data: signed } = await supabase.storage
            .from("products")
            .createSignedUrl(rawImage, 3600);
          image = signed?.signedUrl ?? null;
        }
      }

      const rawPrice = Number.parseFloat(row.sale_price);
      const price = Number.isFinite(rawPrice) ? rawPrice : null;

      return {
        id: String(row.id),
        name: row.name,
        category: row.category ?? null,
        price: price != null ? `₡${formatMoney(price)}` : "Consultar",
        priceValue: price,
        image,
        url: null,
      };
    })
  );

  return NextResponse.json(products, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}