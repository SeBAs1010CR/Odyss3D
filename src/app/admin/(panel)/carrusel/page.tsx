"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";
import {
  addCarouselSlide,
  deleteCarouselSlide,
  fetchCarouselSlides,
  moveCarouselSlide,
  type CarouselSlide,
} from "@/lib/admin/api";
import { Btn, Card, EmptyState, LoadingBlock } from "@/components/admin/ui";

export default function CarruselPage() {
  const [slides, setSlides] = useState<CarouselSlide[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = () => fetchCarouselSlides().then(setSlides).catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error.");
    } finally {
      setBusy(false);
    }
  };

  const onUpload = (files: FileList | null) => {
    if (!files || files.length === 0 || !slides) return;
    const list = Array.from(files);
    run(async () => {
      let count = slides.length;
      for (const file of list) {
        await addCarouselSlide(file, count);
        count += 1;
      }
    });
  };

  const onMove = (index: number, dir: -1 | 1) => {
    if (!slides) return;
    const other = index + dir;
    if (other < 0 || other >= slides.length) return;
    run(() => moveCarouselSlide(slides[index], slides[other]));
  };

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">Carrusel del inicio</h1>
          <p className="admin-page-sub">
            Imágenes que se muestran en el carrusel de la página principal. Si no hay ninguna,
            el carrusel usa las fotos de los productos.
          </p>
        </div>
        <div className="admin-page-actions">
          <label className="btn btn-primary" style={{ cursor: busy ? "wait" : "pointer" }}>
            <ImagePlus size={16} /> Agregar imágenes
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              disabled={busy}
              onChange={(e) => {
                onUpload(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>

      {error && <p className="error-text" style={{ marginBottom: 14 }}>{error}</p>}

      <Card title={`Imágenes (${slides?.length ?? 0})`}>
        {slides === null ? (
          <LoadingBlock />
        ) : slides.length === 0 ? (
          <EmptyState
            icon={<ImagePlus />}
            title="Sin imágenes propias"
            text="Agrega fotos para reemplazar las del catálogo en el carrusel."
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
            {slides.map((s, i) => (
              <div key={s.id} className="card" style={{ padding: 10 }}>
                <img
                  src={s.url}
                  alt={`Imagen ${i + 1}`}
                  style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 8 }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                  <span>#{i + 1}</span>
                  <span style={{ display: "flex", gap: 6 }}>
                    <Btn variant="ghost" size="sm" disabled={busy || i === 0} onClick={() => onMove(i, -1)} aria-label="Subir">
                      <ArrowUp />
                    </Btn>
                    <Btn variant="ghost" size="sm" disabled={busy || i === slides.length - 1} onClick={() => onMove(i, 1)} aria-label="Bajar">
                      <ArrowDown />
                    </Btn>
                    <Btn
                      variant="danger"
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm("¿Quitar esta imagen del carrusel?")) {
                          run(() => deleteCarouselSlide(s));
                        }
                      }}
                      aria-label="Quitar"
                    >
                      <Trash2 />
                    </Btn>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
