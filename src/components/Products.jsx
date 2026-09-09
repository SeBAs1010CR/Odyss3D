"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import productsData from "../data/products.json";

function resolveImage(src) {
  if (!src) return null;
  if (/^(https?:)?\/\//.test(src)) return src;
  return `/images/products/${src}`;
}

export default function Products() {
  const [products, setProducts] = useState(productsData.products || []);

  useEffect(() => {
    let active = true;
    fetch("/api/products")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (active && Array.isArray(data)) setProducts(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
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

        {products.length === 0 ? (
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
