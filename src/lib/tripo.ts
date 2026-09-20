const BASES = [
  process.env.TRIPO_BASE_URL ?? "https://openapi.tripo3d.com/v3",
  "https://openapi.tripo3d.ai/v3",
];

type TripoData = Record<string, unknown>;

async function tripo(path: string, init?: RequestInit): Promise<TripoData> {
  const key = process.env.TRIPO_API_KEY;
  if (!key) {
    throw Object.assign(new Error("Falta TRIPO_API_KEY en el servidor."), { status: 503 });
  }

  const all = BASES.filter((b, i) => BASES.indexOf(b) === i);
  let lastErr: unknown;
  for (const base of all) {
    try {
      const res = await fetch(`${base}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${key}`,
          ...(init?.headers ?? {}),
        },
      });
      const data = (await res.json().catch(() => ({}))) as { code?: number; message?: string; msg?: string; data?: unknown };
      if (!res.ok || (typeof data.code === "number" && data.code !== 0)) {
        const msg = data.message || data.msg || `Tripo respondió ${res.status}`;
        const err = new Error(msg) as Error & { status: number };
        err.status = res.status;
        throw err;
      }
      return (data.data as TripoData) ?? (data as TripoData);
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number }).status;
      if (status && status !== 404 && status !== 405 && status !== 502 && status !== 503) break;
    }
  }
  throw lastErr;
}

export async function tripoUploadImage(buffer: Buffer, mime: string, name: string): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)], { type: mime }), name);
  const data = await tripo("/files", { method: "POST", body: form });
  const token = (data.file_token as string) ?? (data.token as string);
  if (!token) throw new Error("Tripo no devolvió un file_token.");
  return token;
}

export async function tripoCreateImageTask(fileToken: string): Promise<string> {
  const data = await tripo("/generation/image-to-model", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: fileToken }),
  });
  const id = (data.task_id as string) ?? (data.id as string);
  if (!id) throw new Error("Tripo no devolvió un task_id.");
  return id;
}

export type TripoTask = {
  task_id: string;
  type: string;
  status: "queued" | "running" | "success" | "failed" | string;
  progress: number;
  output?: {
    model_url?: string;
    rendered_image_url?: string;
    [k: string]: unknown;
  };
  failed_reason?: string;
};

export async function tripoGetTask(taskId: string): Promise<TripoTask> {
  const data = (await tripo(`/tasks/${taskId}`)) as unknown as TripoTask & {
    fail_reason?: string;
    err_msg?: string;
    error?: string;
  };
  const out = data.output as { model_url?: string; rendered_image_url?: string } | undefined;
  return {
    task_id: data.task_id ?? taskId,
    type: data.type ?? "",
    status: data.status ?? "queued",
    progress: Number(data.progress ?? 0),
    output: out ?? {},
    failed_reason: data.failed_reason ?? data.fail_reason ?? data.err_msg ?? data.error,
  };
}

const convertCache = new Map<string, string>();

export async function tripoEnsureConversion(taskId: string, format: string): Promise<string> {
  const key = `${taskId}|${format}`;
  const cached = convertCache.get(key);
  if (cached) return cached;
  const data = await tripo("/models/convert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: taskId, format }),
  });
  const id = (data.task_id as string) ?? (data.id as string);
  if (!id) throw new Error("Tripo no devolvió un task_id de conversión.");
  convertCache.set(key, id);
  return id;
}

export async function tripoFetchBytes(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo descargar el modelo (${res.status}).`);
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, contentType: res.headers.get("content-type") ?? "application/octet-stream" };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function tripoWaitTask(taskId: string, timeoutMs = 150_000): Promise<TripoTask> {
  const started = Date.now();
  for (;;) {
    const task = await tripoGetTask(taskId);
    if (task.status === "success") return task;
    if (task.status === "failed") throw new Error(task.failed_reason || "La tarea de Tripo falló.");
    if (Date.now() - started > timeoutMs) throw new Error("La tarea tardó demasiado. Intenta de nuevo.");
    await sleep(2000);
  }
}