import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Configuración compartida de la calculadora (/cal), guardada en Configuración > Calculadora.
 * Configurado: true si existe una config guardada en settings.
 */
export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return NextResponse.json({ configured: false });

    const supabase = createServiceClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "calculator_config")
      .maybeSingle();

    if (error || !data?.value || typeof data.value !== "object") {
      return NextResponse.json({ configured: false });
    }

    return NextResponse.json(
      { configured: true, ...(data.value as Record<string, unknown>) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ configured: false });
  }
}