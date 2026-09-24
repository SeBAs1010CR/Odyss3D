"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Boxes, Pencil, Plus, Power, Search, Store, Trash2 } from "lucide-react";
import { deleteProduct, fetchProducts, resolveSignedUrls, updateProduct } from "@/lib/admin/api";
import { formatMoney, toNum } from "@/lib/admin/format";
import type { Product } from "@/lib/admin/types";
import { Badge } from "@/components/admin/Badge";
import { cn } from "@/lib/admin/utils";
import { Btn, ConfirmDialog, EmptyState, LoadingBlock } from "@/components/admin/ui";

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchProducts().then(setProducts).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!products) return;
    const paths = products.flatMap((p) => [p.image, ...(p.images ?? []).map((i) => i.url)]);
    resolveSignedUrls("products", paths).then(setSigned);
  }, [products]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products ?? []) if (p.category) set.add(p.category);
    return [...set].sort();
  }, [products]);

  const filtered = useMemo(() => {
    if (!products) return [];
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (cat !== "all" && p.category !== cat) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || (p.category ?? "").toLowerCase().includes(q);
    });
  }, [products, search, cat]);

  const primaryImage = (p: Product): string | null =>
    p.image ?? (p.images && p.images.length > 0 ? p.images[0].url : null);

  const onToggleActive = async (p: Product) => {
    try {
      await updateProduct(p.id, {
        name: p.name,
        description: p.description,
        category: p.category,
        image: p.image,
        print_minutes: p.print_minutes,
        grams: p.grams,
        production_cost: p.production_cost,
        sale_price: p.sale_price,
        is_active: !p.is_active,
        is_ecommerce: p.is_ecommerce,
        colors: p.colors,
      });
      setProducts((prev) =>
        (prev ?? []).map((x) => (x.id === p.id ? { ...x, is_active: !p.is_active } : x))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar.");
    }
  };

  const onToggleStore = async (p: Product) => {
    try {
      await updateProduct(p.id, {
        name: p.name,
        description: p.description,
        category: p.category,
        image: p.image,
        print_minutes: p.print_minutes,
        grams: p.grams,
        production_cost: p.production_cost,
        sale_price: p.sale_price,
        is_active: p.is_active,
        is_ecommerce: !p.is_ecommerce,
        colors: p.colors,
      });
      setProducts((prev) =>
        (prev ?? []).map((x) => (x.id === p.id ? { ...x, is_ecommerce: !p.is_ecommerce } : x))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar.");
    }
  };

  const onConfirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteProduct(toDelete.id);
      setProducts((prev) => (prev ?? []).filter((x) => x.id !== toDelete.id));
      setToDelete(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar.");
    } finally {
      setDeleting(false);
    }
  };

  if (error && !products) return <div className="error-text">{error}</div>;
  if (!products) return <LoadingBlock />;

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">Productos</h1>
          <p className="admin-page-sub">Catálogo interno de ODYSS3D</p>
        </div>
        <div className="admin-page-actions">
          <Link href="/admin/products/new" className="btn-app btn-app-primary">
            <Plus /> Nuevo producto
          </Link>
        </div>
      </div>

      {error && <p className="error-text" style={{ marginBottom: 14 }}>{error}</p>}

      <div className="filter-bar">
        <div className="search-wrap">
          <Search />
          <input
            className="input"
            placeholder="Buscar producto…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-tabs">
          <button className={`filter-tab ${cat === "all" ? "active" : ""}`} onClick={() => setCat("all")}>
            Todos
          </button>
          {categories.map((c) => (
            <button key={c} className={`filter-tab ${cat === c ? "active" : ""}`} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Boxes />}
          title={products.length === 0 ? "Sin productos" : "Sin resultados"}
          text={products.length === 0 ? "Agrega productos al catálogo para poder asociarlos a pedidos." : "Prueba con otra búsqueda o categoría."}
        />
      ) : (
        <div className="product-grid">
          {filtered.map((p) => {
            const img = primaryImage(p);
            const src = img ? signed[img] : null;
            return (
              <div className="product-admin-card" key={p.id}>
                <div
                  className="product-admin-media"
                  onClick={() => router.push(`/admin/products/${p.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt={p.name} />
                  ) : (
                    <Boxes />
                  )}
                </div>
                <div className="product-admin-body">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span className="product-admin-category">{p.category ?? "Sin categoría"}</span>
                    <Badge tone={p.is_active ? "green" : "slate"}>
                      {p.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <div className="product-admin-name">{p.name}</div>
                  <div className="product-admin-price">
                    {p.sale_price != null ? `₡${formatMoney(p.sale_price)}` : "—"}
                  </div>
                  <div className="table-actions" style={{ marginTop: 6, justifyContent: "space-between" }}>
                    <span className="table-muted" style={{ fontSize: 12 }}>
                      {p.print_minutes != null ? `${p.print_minutes} min` : ""}
                      {p.grams != null ? ` · ${toNum(p.grams)} g` : ""}
                    </span>
                    <div className="table-actions">
                      <button
                        className="icon-btn"
                        onClick={() => onToggleStore(p)}
                        title={p.is_ecommerce ? "Publicado en la tienda" : "Uso interno (fuera de la tienda)"}
                        style={{ color: p.is_ecommerce ? "var(--green, #22c55e)" : undefined }}
                      >
                        <Store />
                      </button>
                      <button
                        className={cn("icon-btn", !p.is_active && "danger")}
                        onClick={() => onToggleActive(p)}
                        title={p.is_active ? "Desactivar" : "Activar"}
                      >
                        <Power />
                      </button>
                      <button className="icon-btn" onClick={() => router.push(`/admin/products/${p.id}`)} title="Editar">
                        <Pencil />
                      </button>
                      <button className="icon-btn danger" onClick={() => setToDelete(p)} title="Eliminar">
                        <Trash2 />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar producto"
        message={
          <>
            ¿Eliminar <strong>{toDelete?.name}</strong> del catálogo? No se perderán los pedidos históricos que lo usen.
          </>
        }
        busy={deleting}
        onCancel={() => setToDelete(null)}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}