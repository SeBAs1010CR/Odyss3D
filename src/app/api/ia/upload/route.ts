import { NextResponse } from "next/server";
import { tripoUploadImage } from "@/lib/tripo";

export const runtime = "nodejs";

const MAX_BYTES = 20 * 1024 * 1024;
const MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Falta el archivo de imagen." }, { status: 400 });
    }
    if (!MIMES.has(file.type)) {
      return NextResponse.json(
        { error: "Solo se aceptan imágenes JPG, PNG o WEBP." },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "La imagen supera los 20 MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const name = /\.(jpe?g|png|webp)$/i.test(file.name)
      ? file.name
      : `imagen.${file.type.split("/")[1]}`;
    const fileToken = await tripoUploadImage(buffer, file.type, name);
    return NextResponse.json({ ok: true, file_token: fileToken });
  } catch (err) {
    console.error("IA upload:", err);
    const msg = err instanceof Error ? err.message : "No se pudo subir la imagen.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}