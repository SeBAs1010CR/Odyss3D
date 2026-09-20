import { NextResponse } from "next/server";
import { tripoGetTask, tripoFetchBytes } from "@/lib/tripo";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const taskId = new URL(request.url).searchParams.get("task_id");
    if (!taskId) {
      return NextResponse.json({ error: "Falta task_id." }, { status: 400 });
    }
    const task = await tripoGetTask(taskId);
    const url = task.output?.model_url;
    if (!url) {
      return NextResponse.json({ error: "El modelo aún no está listo." }, { status: 409 });
    }
    const { buffer, contentType } = await tripoFetchBytes(url);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("IA model:", err);
    const msg = err instanceof Error ? err.message : "No se pudo cargar el modelo.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}