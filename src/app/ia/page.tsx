"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { Box, Download, ImagePlus, Loader2, RefreshCw } from "lucide-react";
import "./ia.css";

const ModelViewer = dynamic(() => import("../../components/ModelViewer"), { ssr: false });

const FORMATS = ["GLB", "STL", "OBJ", "3MF", "USDZ"];

type Status = "idle" | "uploading" | "generating" | "done" | "error";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function Ia() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [status, setStatus] = useState<Status>("idle");
  const [label, setLabel] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [taskId, setTaskId] = useState("");
  const [downloading, setDownloading] = useState("");

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStatus("idle");
    setError("");
    setProgress(0);
    setTaskId("");
  };

  const pollTask = async (id: string) => {
    for (;;) {
      const res = await fetch(`/api/ia/task?task_id=${encodeURIComponent(id)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data?.error ?? "No se pudo consultar la tarea.");
      setProgress(Number(data.progress ?? 0));
      if (data.status === "success") return;
      if (data.status === "failed") throw new Error(data?.error ?? "Tripo no pudo generar el modelo.");
      await sleep(2500);
    }
  };

  const onGenerate = async () => {
    if (!file || status === "uploading" || status === "generating") return;
    setError("");
    try {
      setStatus("uploading");
      setLabel("Subiendo imagen…");
      const form = new FormData();
      form.append("file", file, file.name);
      const up = await fetch("/api/ia/upload", { method: "POST", body: form });
      const upData = await up.json().catch(() => ({}));
      if (!up.ok) throw new Error(upData?.error ?? "No se pudo subir la imagen.");

      setStatus("generating");
      setLabel("Preparando la generación…");
      setProgress(5);
      const gen = await fetch("/api/ia/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_token: upData.file_token }),
      });
      const genData = await gen.json().catch(() => ({}));
      if (!gen.ok) throw new Error(genData?.error ?? "No se pudo iniciar la generación.");

      setTaskId(genData.task_id);
      setLabel("Generando modelo en 3D…");
      await pollTask(genData.task_id);

      setProgress(100);
      setStatus("done");
      setLabel("¡Modelo listo!");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Algo salió mal. Intenta de nuevo.");
      setProgress(0);
    }
  };

  const onDownload = async (format: string) => {
    if (downloading) return;
    setDownloading(format);
    setError("");
    try {
      const res = await fetch("/api/ia/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, format }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "No se pudo exportar.");
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `odyss3d-model.${format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo exportar el modelo.");
    } finally {
      setDownloading("");
    }
  };

  return (
    <>
      <Navbar />
      <main>
        <section className="section">
          <div className="container">
            <div className="ia-head">
              <span className="section-eyebrow">Diseño con IA</span>
              <h1 className="section-title">De la foto al modelo 3D</h1>
              <p className="section-subtitle">
                Sube una imagen y genera un modelo 3D listo para visualizar y
                descargar en STL, 3MF, OBJ, USDZ y más.
              </p>
            </div>

            <div className="ia-grid">
              <div>
                <div
                  className="ia-drop"
                  onClick={() => inputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
                  }}
                >
                  {preview ? (
                    <img src={preview} alt="Imagen seleccionada" />
                  ) : (
                    <>
                      <ImagePlus size={36} strokeWidth={1.6} />
                      <strong>Sube una imagen</strong>
                      <small>JPG, PNG o WEBP · máx. 20 MB</small>
                    </>
                  )}
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={onPick}
                    style={{ display: "none" }}
                  />
                </div>

                {(status === "uploading" || status === "generating") && (
                  <div className="ia-progress">
                    <span>{label}</span>
                    <div className="ia-progress-bar">
                      <div style={{ width: `${Math.max(progress, 4)}%` }} />
                    </div>
                    <small>{Math.round(progress)}%</small>
                  </div>
                )}
                {status === "done" && <p className="ia-ready">{label}</p>}
                {status === "error" && <p className="ia-error">{error}</p>}
              </div>

              <div>
                {status === "done" ? (
                  <>
                    {taskId && <ModelViewer url={`/api/ia/model?task_id=${taskId}`} />}
                    <div className="ia-actions">
                      {FORMATS.map((f) => (
                        <button
                          key={f}
                          className="btn btn-secondary"
                          disabled={Boolean(downloading)}
                          onClick={() => onDownload(f)}
                        >
                          {downloading === f ? (
                            <Loader2 size={16} className="spin" />
                          ) : (
                            <Download size={16} />
                          )}
                          {f}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="ia-placeholder">
                    <Box size={44} strokeWidth={1.4} />
                    <p>
                      Sube una imagen y pulsa{" "}
                      <strong>“Generar en 3D”</strong>. El modelo aparecerá aquí
                      para girarlo con el cursor.
                    </p>
                    <button
                      className="btn btn-primary"
                      disabled={!file || status === "uploading" || status === "generating"}
                      onClick={onGenerate}
                    >
                      {status === "uploading" || status === "generating" ? (
                        <>
                          <Loader2 size={18} className="spin" /> Generando…
                        </>
                      ) : file ? (
                        <>
                          <RefreshCw size={18} /> Generar en 3D
                        </>
                      ) : (
                        "Generar en 3D"
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}