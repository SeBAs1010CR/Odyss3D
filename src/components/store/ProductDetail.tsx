"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import type { StoreProduct } from "@/lib/store/products";
import { CartProvider } from "@/lib/store/CartContext";
import { Cubo } from "./Cubo";
import { AddToCubeButton } from "./AddToCubeButton";
import { StoreProductCard } from "./StoreProductCard";
import { cn } from "@/lib/admin/utils";

export function ProductDetail({
  product,
  similares,
  colorHex,
}: {
  product: StoreProduct;
  similares: StoreProduct[];
  colorHex: Record<string, string>;
}) {
  const gallery = product.images.length > 0 ? product.images : product.image ? [product.image] : [];
  const [idx, setIdx] = useState(gallery.length > 0 ? 0 : -1);
  const [color, setColor] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  const currentImage = idx >= 0 ? gallery[idx] : null;

  return (
    <CartProvider>
      <header className="store-nav">
        <a href="/" className="store-nav-logo" aria-label="ODYSS3D home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/branding/logo-horizontal.png?v=2" alt="ODYSS3D" />
        </a>
        <a href="/#productos" className="btn btn-primary store-nav-cta">
          Tienda
        </a>
      </header>

      <main className="store-page">
        <div className="store-crumbs">
          <Link href="/">Inicio</Link>
          <span>/</span>
          <Link href="/#productos">Productos</Link>
          {product.category && (
            <>
              <span>/</span>
              <span>{product.category}</span>
            </>
          )}
        </div>

        <div className="store-product">
          <div className="store-gallery">
            {currentImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="store-gallery-main" src={currentImage} alt={product.name} />
            ) : (
              <div className="store-gallery-main store-gallery-ph">Sin imagen</div>
            )}
            {gallery.length > 1 && (
              <div className="store-gallery-thumbs">
                {gallery.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    className={cn("store-thumb", i === idx && "active")}
                    onClick={() => setIdx(i)}
                    aria-label={`Ver imagen ${i + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="store-info">
            <span className="store-card-category">{product.category ?? "Producto"}</span>
            <h1 className="store-title">{product.name}</h1>
            <div className="store-price">{product.priceText}</div>

            {product.description && <p className="store-description">{product.description}</p>}

            {product.colors.length > 0 && (
              <div className="store-colors">
                <span className="store-label">Color:</span>
                <div className="store-color-balls">
                  {product.colors.map((c) => {
                    const hex = colorHex[c];
                    const active = color === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        className={cn("store-color-ball", active && "active")}
                        onClick={() => setColor(active ? null : c)}
                        title={c}
                        aria-pressed={active}
                      >
                        <span
                          className="store-color-ball-swatch"
                          style={
                            hex
                              ? { backgroundColor: hex }
                              : { background: "linear-gradient(135deg,#9ca3af,#6b7280)" }
                          }
                        />
                        <span className="store-color-ball-name">{c}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="store-qty-row">
              <div className="store-quantity">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Menos">
                  <Minus size={16} />
                </button>
                <span>{qty}</span>
                <button type="button" onClick={() => setQty((q) => Math.min(99, q + 1))} aria-label="Más">
                  <Plus size={16} />
                </button>
              </div>

              <AddToCubeButton
                className="store-add"
                productId={product.id}
                name={product.name}
                price={product.price}
                image={product.image ?? (gallery.length > 0 ? gallery[0] : null)}
                color={color}
                qty={qty}
              />
            </div>

            <div className="store-notes">
              <p>• Personalizamos a tu gusto: colores y cantidad según disponibilidad.</p>
              <p>• El pedido se confirma por WhatsApp después de agregarlo al cubo.</p>
              <p className="store-back">
                <ArrowLeft size={14} /> <Link href="/#productos">Volver a todos los productos</Link>
              </p>
            </div>
          </div>
        </div>

        {similares.length > 0 && (
          <section className="store-similares">
            <h2 className="store-similares-title">Productos similares</h2>
            <div className="store-similares-grid">
              {similares.map((p) => (
                <StoreProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </main>

      <Cubo />
    </CartProvider>
  );
}