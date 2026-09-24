"use client";

import { useState } from "react";
import { Box, Check } from "lucide-react";
import { useCart } from "@/lib/store/CartContext";
import { cn } from "@/lib/admin/utils";

export function AddToCubeButton({
  productId,
  name,
  price,
  image,
  color,
  qty = 1,
  className,
}: {
  productId: string;
  name: string;
  price: number | null;
  image: string | null;
  color?: string | null;
  qty?: number;
  className?: string;
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  const onClick = () => {
    add({ productId, name, price, image, color: color ?? null, qty });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  return (
    <button
      type="button"
      className={cn("add-to-cube", added && "added", className)}
      onClick={onClick}
      aria-label={`Agregar ${name} al cubo`}
    >
      {added ? <Check size={16} /> : <Box size={16} />}
      {added ? "En tu cubo" : "Al cubo"}
    </button>
  );
}