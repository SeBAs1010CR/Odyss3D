import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

const BUCKET = "cotizaciones";
const MAX_FILES = 5;
const MAX_BYTES = 20 * 1024 * 1024;

const ALLOWED_EXT = [
  "png", "jpg", "jpeg", "webp", "gif",
  "pdf",
  "stl", "step", "stp", "obj", "iges", "igs", "sldprt",
  "zip", "rar",
];

type FileEntry = { name: string; buffer: Buffer; path: string };

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

function getTransporter() {
  const host = process.env.MAIL_HOST;
  const port = Number(process.env.MAIL_PORT ?? 587);
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    return NextResponse.json({ error: "No se pudo procesar la solicitud." }, { status: 500 });
  }

  const supabase = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const name = (form.get("name")?.toString() ?? "").trim();
  const contact = (form.get("contact")?.toString() ?? "").trim();
  const message = (form.get("message")?.toString() ?? "").trim();

  if (!name || !contact) {
    return NextResponse.json({ error: "Faltan el nombre y el contacto." }, { status: 400 });
  }

  const raw = form.getAll("files").filter((v): v is File => typeof File !== "undefined" && v instanceof File);
  if (raw.length > MAX_FILES) {
    return NextResponse.json({ error: `Máximo ${MAX_FILES} archivos.` }, { status: 400 });
  }
  if (raw.some((f) => f.size > MAX_BYTES)) {
    return NextResponse.json({ error: "Un archivo supera los 20 MB." }, { status: 400 });
  }
  const bad = raw.find((f) => !ALLOWED_EXT.includes(extOf(f.name)));
  if (bad) {
    return NextResponse.json({ error: `Formato no permitido: ${bad.name}` }, { status: 400 });
  }

  const uploaded: FileEntry[] = [];
  try {
    const stamp = Date.now();
    for (let i = 0; i < raw.length; i++) {
      const f = raw[i];
      const buffer = Buffer.from(await f.arrayBuffer());
      const safe = f.name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
      const path = `${stamp}-${i}-${safe}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
        contentType: f.type || "application/octet-stream",
      });
      if (error) throw error;
      uploaded.push({ name: f.name, buffer, path });
    }

    const paths = uploaded.map((u) => u.path);
    const { error: insertError } = await supabase.from("contact_requests").insert({
      name,
      contact,
      message,
      file_paths: paths,
    });
    if (insertError) throw insertError;

    let emailSent = false;
    const transporter = getTransporter();
    const to = process.env.MAIL_TO;
    if (transporter && to) {
      try {
        await transporter.sendMail({
          from: process.env.MAIL_FROM ?? process.env.MAIL_USER,
          to,
          subject: `Cotización de ${name}`,
          text: [
            `Nombre: ${name}`,
            `Contacto: ${contact}`,
            `Mensaje: ${message || "—"}`,
            "",
            `Archivos adjuntos: ${uploaded.length || "ninguno"}`,
            ...uploaded.map((u) => `  • ${u.name}`),
          ].join("\n"),
          html: `
            <h3>Nueva solicitud de cotización — ODYSS3D</h3>
            <p><strong>Nombre:</strong> ${name.replace(/</g, "&lt;")}</p>
            <p><strong>Contacto:</strong> ${contact.replace(/</g, "&lt;")}</p>
            <p><strong>Mensaje:</strong> ${message.replace(/</g, "&lt;") || "—"}</p>
            <p><strong>Archivos:</strong> ${uploaded.length || "ninguno"}</p>
            <ul>${uploaded.map((u) => `<li>${u.name.replace(/</g, "&lt;")}</li>`).join("")}</ul>
          `,
          attachments: uploaded.map((u) => ({
            filename: u.name,
            content: u.buffer,
          })),
        });
        emailSent = true;
      } catch (err) {
        console.error("Error enviando correo:", err);
      }
    }

    return NextResponse.json({ ok: true, emailSent });
  } catch (err) {
    try {
      await supabase.storage.from(BUCKET).remove(uploaded.map((u) => u.path));
    } catch {
      /* noop */
    }
    console.error("Cotización:", err);
    return NextResponse.json(
      { error: "No se pudo guardar la solicitud. Inténtalo de nuevo." },
      { status: 500 }
    );
  }
}