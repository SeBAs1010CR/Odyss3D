"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import {
  addProductImage,
  deleteProduct,
  fetchProduct,
  removeProductImage,
  updateProduct,
} from "@/lib/admin/api";
import type { Product } from "@/lib/admin/types";
import { ProductForm } from "@/components/admin/ProductForm";
import { UploadManager, type ManagedImage } from "@/components/admin/UploadManager";
import { Btn, Card, ConfirmDialog, LoadingBlock } from "@/components/admin/ui";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      setProduct(await fetchProduct(params.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el producto.");
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const onAddImages = async (paths: string[]) => {
    if (!product) return;
    for (const path of paths) {
      await addProductImage(product.id, path);
    }
    if (!product.image) {
      await updateProduct(product.id, {
        name: product.name,
        description: product.description,
        category: product.category,
        image: paths[0],
        print_minutes: product.print_minutes,
        grams: product.grams,
        production_cost: product.production_cost,
        sale_price: product.sale_price,
        is_active: product.is_active,
      });
    }
    setSaved(true);
    await load();
  };

  const onRemoveImage = async (image: ManagedImage) => {
    if (!product) return;
    await removeProductImage(image);
    if (product.image === image.url) {
      const next = (product.images ?? []).find((i) => i.id !== image.id);
      await updateProduct(product.id, {
        name: product.name,
        description: product.description,
        category: product.category,
        image: next?.url ?? null,
        print_minutes: product.print_minutes,
        grams: product.grams,
        production_cost: product.production_cost,
        sale_price: product.sale_price,
        is_active: product.is_active,
      });
    }
    setSaved(true);
    await load();
  };

  const onConfirmDelete = async () => {
    if (!product) return;
    setDeleting(true);
    try {
      await deleteProduct(product.id);
      router.replace("/admin/products");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (error && !product) return <div className="error-text">{error}</div>;
  if (!product) return <LoadingBlock />;

  return (
    <>
      <div className="admin-page-head">
        <div>
          <div className="kv-row" style={{ marginBottom: 6 }}>
            <Btn variant="ghost" size="sm" onClick={() => router.push("/admin/products")}>
              <ArrowLeft /> Productos
            </Btn>
          </div>
          <h1 className="admin-page-title">{product.name}</h1>
          <p className="admin-page-sub">
            {product.category ?? "Sin categoría"}
            {product.sale_price != null && ` · ₡${Math.round(product.sale_price)}`}
          </p>
        </div>
        <div className="admin-page-actions">
          <Btn variant="danger" onClick={() => setConfirmDelete(true)}>
            <Trash2 /> Eliminar
          </Btn>
        </div>
      </div>

      {saved && <p className="success-text" style={{ marginBottom: 14 }}>Cambios guardados.</p>}

      <div className="detail-grid">
        <ProductForm product={product} onSaved={() => { setSaved(true); load(); }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card title={`Imágenes (${product.images?.length ?? 0})`}>
            <UploadManager
              bucket="products"
              folder={product.id}
              images={(product.images ?? []).map((i) => ({ id: i.id, url: i.url }))}
              onAdd={onAddImages}
              onRemove={onRemoveImage}
            />
          </Card>

          <Card title="Costos">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="kv-row"><span>Precio de venta</span><strong>₡{product.sale_price ?? "—"}</strong></div>
              <div className="kv-row"><span>Costo de producción</span><strong>₡{product.production_cost ?? "—"}</strong></div>
              <div className="kv-row"><span>Margen</span><strong>
                {product.production_cost ? `${Math.round(((product.sale_price ?? 0) / product.production_cost - 1) * 100)}%` : "—"}
              </strong></div>
              <div className="kv-row"><span>Tiempo de impresión</span><strong>{product.print_minutes != null ? `${product.print_minutes} min` : "—"}</strong></div>
              <div className="kv-row"><span>Filamento</span><strong>{product.grams != null ? `${product.grams} g` : "—"}</strong></div>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Eliminar producto"
        message="Los pedidos históricos que usen este producto se conservarán. ¿Eliminar?"
        busy={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}