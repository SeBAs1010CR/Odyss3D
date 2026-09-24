"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import productsData from "../data/products.json";

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
      image: p.image ?? null,
      url: p.url ?? "#contacto",
    }))
    .filter((p) => p.name);
}

export default function Products() {
  const [products, setProducts] = useState(() => normalizeProducts(productsData.products || []));
  const [failed, setFailed] = useState(false);

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
              <path
                d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"
                strokeLinejoin="round"
              />
              <path
                d="M12 12l8-4.5M12 12v9M12 12L4 7.5"
                strokeLinejoin="round"
              />
            </svg>
            <h3 className="products-empty-title">Próximamente</h3>
            <p className="products-empty-text">
              Estamos preparando nuevos productos.
            </p>
          </motion.div>
        ) : (
          <div className="products-grid">
            {products.map((product, i) => (
              <motion.a
                key={product.id ?? product.name ?? i}
                href={product.url ?? "#contacto"}
                className="product-card"
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: (i % 4) * 0.08 }}
              >
                <div className="product-card-media">
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
                        <path
                          d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M12 12l8-4.5M12 12v9M12 12L4 7.5"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="product-card-body">
                  {product.category && (
                    <span className="product-card-category">
                      {product.category}
                    </span>
                  )}
                  <h3 className="product-card-name">{product.name}</h3>
                  <div className="product-card-foot">
                    {product.price ? (
                      <span className="product-card-price">
                        {product.price}
                      </span>
                    ) : (
                      <span className="product-card-price">Consultar</span>
                    )}
                    <span className="product-card-view">
                      Ver producto
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        width="15"
                        height="15"
                      >
                        <path
                          d="M5 12h14M13 6l6 6-6 6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </div>
                </div>
              </motion.a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
