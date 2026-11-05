import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Imágenes propias del carrusel del Home (públicas, en el bucket "carousel"). */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json([], { headers: { "Cache-Control": "no-store" } });

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase
    .from("carousel_slides")
    .select("id, path, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json([], { headers: { "Cache-Control": "no-store" } });

  const slides = (data ?? []).map((row) => ({
    id: row.id as string,
    image: `${url}/storage/v1/object/public/carousel/${row.path}`,
  }));
  return NextResponse.json(slides, { headers: { "Cache-Control": "no-store" } });
}
