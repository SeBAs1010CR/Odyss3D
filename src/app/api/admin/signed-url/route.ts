import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { bucket?: string; paths?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const { bucket, paths } = body;
  if (
    !bucket ||
    (bucket !== "products" && bucket !== "orders") ||
    !Array.isArray(paths) ||
    paths.length === 0 ||
    paths.length > 100
  ) {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "Servidor mal configurado" }, { status: 500 });
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const urls: Record<string, string> = {};
  for (const p of paths) {
    if (typeof p !== "string" || p.startsWith("http")) continue;
    const { data } = await admin.storage.from(bucket).createSignedUrl(p, 3600);
    if (data) urls[p] = data.signedUrl;
  }

  return NextResponse.json({ urls });
}