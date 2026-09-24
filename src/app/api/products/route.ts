import { NextResponse } from "next/server";
import { listStoreProducts } from "@/lib/store/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Catálogo público del ecommerce.
 * Devuelve los productos publicados en la tienda (is_ecommerce + is_active)
 * con su imagen resuelta (públicas en /images/… o firmadas de Storage).
 */
export async function GET() {
  try {
    const store = await listStoreProducts();

    const products = store.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.priceText,
      priceValue: p.price,
      image: p.image,
      colors: p.colors,
      url: null,
    }));

    return NextResponse.json(products, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "No se pudo cargar el catálogo" }, { status: 500 });
  }
}