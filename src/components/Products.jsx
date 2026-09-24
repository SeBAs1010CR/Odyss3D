"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import productsData from "../data/products.json";
import { AddToCubeButton } from "./store/AddToCubeButton";
import { cn } from "@/lib/admin/utils";

function resolveImage(src) {
  if (!src) return null;
  if (/^(https?:)?\//.test(src)) return src;
  return `/images/products/${src}`;
}

function normalizeProducts(items) {
  return (items ?? [])
    .map((p) => ({
      id: p.id ?? p.name,
      name: p.name,
      category: p.category ?? null,
      price:
        p.price ??
        (p.sale_price != null
          ? `₡${new Intl.NumberFormat("es-CR").format(Number(p.sale_price) || 0)}`
          : null),
      priceValue:
        p.priceValue ??
        (p.sale_price != null ? Number(p.sale_price) || null : null) ??
        null,
      image: p.image ?? null,
      url: p.url ?? null,
    }))
    .filter((p) => p.name);
}

export default function Products() {
  const [products, setProducts] = useState(() => normalizeProducts(productsData.products || []));
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");

  const load = () => {
    setFailed(false);
    fetch("/api/products")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => {
        if (Array.isArray(data)) setProducts(normalizeProducts(data));
      })
      .catch(() => setFailed(true));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = useMemo(() => {
    const set = new Set();
    for (const p of products) if (p.category) set.add(p.category);
    return [...set].sort();
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (cat !== "all" && p.category !== cat) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) || (p.category ?? "").toLowerCase().includes(q)
      );
    });
  }, [products, search, cat]);

  const linkFor = (p) => (p.id ? `/producto/${p.id}` : "/#productos");

  return (
    <section id="productos" className="section products">
      <div className="container">
        <div className="products-head">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
          >
            <span className="section-eyebrow">Catálogo</span>
            <h2 className="section-title">Productos</h2>
            <p className="section-subtitle">
              Piezas, prototipos y productos fabricados con impresión 3D. Este
              catálogo se actualiza automáticamente a medida que agregamos
              nuevo stock.
            </p>
          </motion.div>
        </div>

        {failed && products.length === 0 ? (
          <div className="products-empty">
            <svg
              className="products-empty-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            >
              <path d="M12 9v4M12 17h.01" strokeLinecap="round" />
              <circle cx="12" cy="12" r="9" />
            </svg>
            <h3 className="products-empty-title">No se pudo cargar el catálogo</h3>
            <p className="products-empty-text">
              Revisa que el servidor tenga configurada SUPABASE_SERVICE_ROLE_KEY e intenta de nuevo.
            </p>
            <button type="button" className="btn btn-secondary" onClick={load}>
              Reintentar
            </button>
          </div>
        ) : products.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="products-empty"
          >
            <svg
              className="products-empty-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            >
              <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" strokeLinejoin="round" />
              <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" strokeLinejoin="round" />
            </svg>
            <h3 className="products-empty-title">Próximamente</h3>
            <p className="products-empty-text">Estamos preparando nuevos productos.</p>
          </motion.div>
        ) : (
          <>
            {(search || categories.length > 0) && (
              <div className="products-toolbar">
                <div className="products-search">
                  <Search size={17} />
                  <input
                    type="search"
                    placeholder="Buscar producto…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                {categories.length > 0 && (
                  <div className="products-chips">
                    {["all", ...categories].map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={cn("products-chip", cat === c && "active")}
                        onClick={() => setCat(c)}
                      >
                        {c === "all" ? "Todos" : c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {filtered.length === 0 ? (
              <div className="products-empty">
                <h3 className="products-empty-title">Sin resultados</h3>
                <p className="products-empty-text">
                  No encontramos productos con ese filtro. Prueba otro término o categoría.
                </p>
              </div>
            ) : (
              <div className="products-grid">
                {filtered.map((product, i) => (
                  <motion.div
                    key={product.id ?? product.name ?? i}
                    className="product-card"
                    initial={{ opacity: 0, y: 28 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.6, delay: (i % 4) * 0.08 }}
                  >
                    <Link href={linkFor(product)} className="product-card-media">
                      {product.image ? (
                        <img
                          src={resolveImage(product.image)}
                          alt={product.name}
                          loading="lazy"
                        />
                      ) : (
                        <div className="product-card-placeholder">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1"
                          >
                            <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" strokeLinejoin="round" />
                            <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" strokeLinejoin="round" />
                          </svg>
                        </div>
                      )}
                    </Link>

                    <div className="product-card-body">
                      {product.category && (
                        <span className="product-card-category">{product.category}</span>
                      )}
                      <h3 className="product-card-name">
                        <Link href={linkFor(product)}>{product.name}</Link>
                      </h3>
                      <div className="product-card-foot">
                        <span className="product-card-price">
                          {product.price ? product.price : "Consultar"}
                        </span>
                        <Link href={linkFor(product)} className="product-card-view">
                          Ver producto
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            width="15"
                            height="15"
                          >
                            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </Link>
                      </div>
                      <div className="product-card-actions">
                        <AddToCubeButton
                          productId={product.id}
                          name={product.name}
                          price={product.priceValue}
                          image={product.image ? resolveImage(product.image) : null}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}