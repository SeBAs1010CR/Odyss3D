import { NextResponse } from "next/server";
import { tripoGetTask } from "@/lib/tripo";
import { requireUser } from "@/lib/supabase/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const taskId = new URL(request.url).searchParams.get("task_id");
    if (!taskId) {
      return NextResponse.json({ error: "Falta task_id." }, { status: 400 });
    }
    const task = await tripoGetTask(taskId);
    return NextResponse.json({
      ok: true,
      status: task.status,
      progress: task.progress,
      error: task.status === "failed" ? task.failed_reason ?? null : null,
      has_model: Boolean(task.output?.model_url),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "No se pudo consultar la tarea.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}