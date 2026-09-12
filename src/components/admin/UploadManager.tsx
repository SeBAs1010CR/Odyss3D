"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ImagePlus, Lock, Trash2 } from "lucide-react";
import { resolveSignedUrls, uploadImage } from "@/lib/admin/api";
import { cn } from "@/lib/admin/utils";
import { Spinner } from "./ui";

export interface ManagedImage {
  id: string;
  url: string;
}

interface Props {
  bucket: "products" | "orders";
  folder: string;
  images: ManagedImage[];
  onAdd: (urls: string[]) => Promise<void>;
  onRemove: (image: ManagedImage) => Promise<void>;
  hint?: ReactNode;
}

export function UploadManager({ bucket, folder, images, onAdd, onRemove, hint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    resolveSignedUrls(bucket, images.map((i) => i.url)).then((urls) => {
      if (active) setSigned((prev) => ({ ...prev, ...urls }));
    });
    return () => {
      active = false;
    };
  }, [bucket, images]);

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError("");
    try {
      const paths: string[] = [];
      for (const file of Array.from(files)) {
        const path = await uploadImage(bucket, folder, file);
        paths.push(path);
      }
      await onAdd(paths);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onRemoveImage = async (image: ManagedImage) => {
    setRemoving(image.id);
    try {
      await onRemove(image);
      setSigned((prev) => {
        const next = { ...prev };
        delete next[image.url];
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar la imagen.");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => onFiles(e.target.files)}
      />

      {images.length > 0 && (
        <div className="image-grid">
          {images.map((image) => {
            const src = signed[image.url];
            return (
              <div className="image-tile" key={image.id}>
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt="Imagen del pedido" />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#4b5160",
                    }}
                  >
                    <Lock size={22} />
                  </div>
                )}
                <button
                  className="image-tile-remove"
                  onClick={() => onRemoveImage(image)}
                  disabled={removing === image.id}
                  aria-label="Eliminar imagen"
                >
                  {removing === image.id ? <Spinner /> : <Trash2 />}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        className={cn("upload-zone", uploading && "opacity-60")}
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{ width: "100%", marginTop: images.length > 0 ? 14 : 0 }}
      >
        {uploading ? (
          <span className="uploading-note">
            <Spinner /> Subiendo imágenes…
          </span>
        ) : (
          <>
            <ImagePlus />
            {images.length > 0 ? "Agregar más imágenes" : "Subir imágenes"}
            {hint && <span>{hint}</span>}
          </>
        )}
      </button>

      {error && <p className="error-text" style={{ marginTop: 10 }}>{error}</p>}
    </div>
  );
}