"use client";

import Link from "next/link";
import type { StoreProduct } from "@/lib/store/products";
import { AddToCubeButton } from "./AddToCubeButton";

export function StoreProductCard({ product }: { product: StoreProduct }) {
  return (
    <div className="store-card">
      <Link href={`/producto/${product.id}`} className="store-card-media">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image} alt={product.name} loading="lazy" />
        ) : (
          <span className="store-card-ph">Sin imagen</span>
        )}
      </Link>
      <div className="store-card-body">
        <span className="store-card-category">{product.category ?? "Producto"}</span>
        <Link href={`/producto/${product.id}`} className="store-card-name">
          {product.name}
        </Link>
        <div className="store-card-foot">
          <span className="store-card-price">{product.priceText}</span>
          <AddToCubeButton
            productId={product.id}
            name={product.name}
            price={product.price}
            image={product.image}
          />
        </div>
      </div>
    </div>
  );
}