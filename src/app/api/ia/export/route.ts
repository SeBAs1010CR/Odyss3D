import { NextResponse } from "next/server";
import { tripoGetTask, tripoEnsureConversion, tripoWaitTask, tripoFetchBytes } from "@/lib/tripo";
import { requireUser } from "@/lib/supabase/auth";

export const runtime = "nodejs";

const FORMATS: Record<string, { ext: string; type: string }> = {
  GLB: { ext: "glb", type: "model/gltf-binary" },
  STL: { ext: "stl", type: "application/sla" },
  OBJ: { ext: "obj", type: "text/plain" },
  "3MF": { ext: "3mf", type: "application/vnd.ms-package.3dmanufacturing-3dmodel" },
  USDZ: { ext: "usdz", type: "model/vnd.usdz+zip" },
  GLTF: { ext: "gltf", type: "model/gltf+json" },
  FBX: { ext: "fbx", type: "application/octet-stream" },
};

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const taskId = typeof body.task_id === "string" ? body.task_id : "";
    const format = String(body.format ?? "").toUpperCase();

    if (!taskId) return NextResponse.json({ error: "Falta task_id." }, { status: 400 });
    const meta = FORMATS[format];
    if (!meta) {
      return NextResponse.json(
        { error: `Formato no soportado: ${format}. Usa GLB, STL, OBJ, 3MF, USDZ, GLTF o FBX.` },
        { status: 400 }
      );
    }

    await tripoWaitTask(taskId);

    let url: string | undefined;
    if (format === "GLB") {
      url = (await tripoGetTask(taskId)).output?.model_url;
    } else {
      const convertId = await tripoEnsureConversion(taskId, format);
      const converted = await tripoWaitTask(convertId);
      url = converted.output?.model_url;
    }
    if (!url) throw new Error("Tripo no devolvió una URL de descarga.");

    const { buffer, contentType } = await tripoFetchBytes(url);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType || meta.type,
        "Content-Disposition": `attachment; filename="odyss3d-model.${meta.ext}"`,
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("IA export:", err);
    const msg = err instanceof Error ? err.message : "No se pudo exportar el modelo.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}