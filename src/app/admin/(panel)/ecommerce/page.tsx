"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Pencil, Plus, Power, Search, Store, Tag } from "lucide-react";
import { fetchProducts, resolveSignedUrls, updateProduct } from "@/lib/admin/api";
import { formatMoney, toNum } from "@/lib/admin/format";
import type { Product } from "@/lib/admin/types";
import { Badge } from "@/components/admin/Badge";
import { StatCard } from "@/components/admin/StatCard";
import { cn } from "@/lib/admin/utils";
import { EmptyState, LoadingBlock } from "@/components/admin/ui";

type Draft = Record<string, string>;

export default function EcommercePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");
  const [drafts, setDrafts] = useState<Draft>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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

  const active = useMemo(() => (products ?? []).filter((p) => p.is_ecommerce), [products]);
  const priced = useMemo(() => {
    const withPrice = active.filter((p) => p.sale_price != null);
    if (withPrice.length === 0) return 0;
    return withPrice.reduce((s, p) => s + (p.sale_price as number), 0) / withPrice.length;
  }, [active]);

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

  const flash = (msg: string) => {
    setError("");
    setNotice(msg);
    window.setTimeout(() => setNotice(""), 2500);
  };

  const onToggleStore = async (p: Product) => {
    setSaving(p.id);
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
      flash(p.is_ecommerce ? "Producto retirado de la tienda." : "Producto publicado en la tienda.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar.");
    } finally {
      setSaving(null);
    }
  };

  const onSavePrice = async (p: Product) => {
    const raw = (drafts[p.id] ?? "").replace(",", ".").trim();
    const price = raw === "" ? null : Number.parseFloat(raw);
    if (price != null && !Number.isFinite(price)) {
      setError("Ingresa un precio válido.");
      return;
    }
    setSaving(p.id);
    try {
      await updateProduct(p.id, { sale_price: price });
      setProducts((prev) =>
        (prev ?? []).map((x) => (x.id === p.id ? { ...x, sale_price: price } : x))
      );
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[p.id];
        return next;
      });
      flash("Precio actualizado.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el precio.");
    } finally {
      setSaving(null);
    }
  };

  if (error && !products) return <div className="error-text">{error}</div>;
  if (!products) return <LoadingBlock />;

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">Ecommerce</h1>
          <p className="admin-page-sub">Productos en venta en la tienda de la página pública</p>
        </div>
        <div className="admin-page-actions">
          <Link href="/#productos" target="_blank" className="btn-app btn-app-ghost">
            <ExternalLink /> Ver tienda
          </Link>
          <Link href="/admin/products/new" className="btn-app btn-app-primary">
            <Plus /> Nuevo producto
          </Link>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 22 }}>
        <StatCard
          icon={<Store />}
          color="#22c55e"
          label="En tienda"
          value={active.length}
          sub={`de ${products.length} productos`}
        />
        <StatCard
          icon={<Tag />}
          color="#0066ff"
          label="Precio promedio"
          value={`₡${formatMoney(priced)}`}
          sub="de productos en tienda"
        />
        <StatCard
          icon={<Check />}
          color="#a855f7"
          label="Con precio"
          value={active.filter((p) => p.sale_price != null).length}
          sub="listos para vender"
        />
      </div>

      {(error || notice) && (
        <p
          className={cn("error-text", notice && "success-text")}
          style={{ marginBottom: 14 }}
        >
          {error || notice}
        </p>
      )}

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
          icon={<Store />}
          title={products.length === 0 ? "Sin productos" : "Sin resultados"}
          text={products.length === 0 ? "Crea productos en el catálogo y actívalos para publicarlos en la tienda." : "Prueba con otra búsqueda o categoría."}
        />
      ) : (
        <div className="product-grid">
          {filtered.map((p) => {
            const img = primaryImage(p);
            const src = img ? signed[img] : null;
            const dirty = drafts[p.id] != null;
            const draftVal = drafts[p.id] ?? (p.sale_price != null ? String(p.sale_price) : "");
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
                    <Store />
                  )}
                </div>
                <div className="product-admin-body">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span className="product-admin-category">{p.category ?? "Sin categoría"}</span>
                    <Badge tone={p.is_ecommerce ? "green" : "slate"}>
                      {p.is_ecommerce ? "En tienda" : "Uso interno / fuera"}
                    </Badge>
                  </div>
                  <div className="product-admin-name">{p.name}</div>

                  <div className="ecommerce-price-row">
                    <span className="input-with-suffix" style={{ flex: 1 }}>
                      <input
                        className="input"
                        style={{ width: "100%" }}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        value={draftVal}
                        placeholder="Precio"
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))
                        }
                      />
                      <span className="suffix">₡</span>
                    </span>
                    <button
                      className="icon-btn"
                      disabled={!dirty || saving === p.id}
                      onClick={() => onSavePrice(p)}
                      title="Guardar precio"
                      style={{ flexShrink: 0 }}
                    >
                      <Check />
                    </button>
                  </div>

                  <div className="table-actions" style={{ marginTop: 6, justifyContent: "space-between" }}>
                    <span className="table-muted" style={{ fontSize: 12 }}>
                      {p.print_minutes != null ? `${p.print_minutes} min` : ""}
                      {p.grams != null ? ` · ${toNum(p.grams)} g` : ""}
                    </span>
                    <div className="table-actions">
                      <button
                        className={cn("icon-btn", !p.is_ecommerce && "danger")}
                        onClick={() => onToggleStore(p)}
                        disabled={saving === p.id}
                        title={p.is_ecommerce ? "Quitar de la tienda" : "Publicar en tienda"}
                      >
                        <Power />
                      </button>
                      <button className="icon-btn" onClick={() => router.push(`/admin/products/${p.id}`)} title="Editar">
                        <Pencil />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}