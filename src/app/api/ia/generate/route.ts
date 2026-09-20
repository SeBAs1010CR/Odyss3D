import { NextResponse } from "next/server";
import { tripoCreateImageTask } from "@/lib/tripo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const fileToken = body.file_token;
    if (!fileToken || typeof fileToken !== "string") {
      return NextResponse.json({ error: "Falta el file_token." }, { status: 400 });
    }
    const taskId = await tripoCreateImageTask(fileToken);
    return NextResponse.json({ ok: true, task_id: taskId });
  } catch (err) {
    console.error("IA generate:", err);
    const msg = err instanceof Error ? err.message : "No se pudo generar el modelo.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}