import { createClient as createServiceClient } from "@supabase/supabase-js";
import { formatMoney } from "@/lib/calculator";

export type StoreProduct = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number | null;
  priceText: string;
  image: string | null;
  images: string[];
  colors: string[];
};

/* eslint-disable @typescript-eslint/no-explicit-any */

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Productos no disponibles");
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function resolveImage(
  supabase: ReturnType<typeof serviceClient>,
  raw: string
): Promise<string> {
  if (/^https?:\/\//.test(raw) || raw.startsWith("/")) return raw;
  const { data } = await supabase.storage.from("products").createSignedUrl(raw, 3600);
  return data?.signedUrl ?? raw;
}

/** Catálogo público de la tienda (solo publicados en ecommerce y activos). */
export async function listStoreProducts(): Promise<StoreProduct[]> {
  const supabase = serviceClient();

  const { data, error } = await supabase
    .from("products")
    .select("*, images:product_images(url)")
    .eq("is_active", true)
    .eq("is_ecommerce", true)
    .order("name");

  if (error) throw new Error("No se pudo cargar el catálogo");

  return Promise.all(
    (data ?? []).map(async (row: any) => {
      const rawImage = (row.image as string | null) ?? null;
      const rawImages: string[] = Array.isArray(row.images)
        ? (row.images as any[]).map((i) => String(i.url ?? "")).filter(Boolean)
        : [];

      const resolved = rawImage
        ? [await resolveImage(supabase, rawImage), ...rawImages.filter((u) => u !== rawImage)]
        : rawImages;

      const images = await Promise.all(resolved.map((u) => resolveImage(supabase, u)));

      const rawPrice = Number.parseFloat(row.sale_price);
      const price = Number.isFinite(rawPrice) ? rawPrice : null;

      return {
        id: String(row.id),
        name: String(row.name ?? ""),
        description: (row.description as string | null) ?? null,
        category: (row.category as string | null) ?? null,
        price,
        priceText: price != null ? `₡${formatMoney(price)}` : "Consultar",
        image: images[0] ?? null,
        images: images.filter(Boolean),
        colors: Array.isArray(row.colors)
          ? (row.colors as string[]).filter(Boolean)
          : [],
      };
    })
  );
}