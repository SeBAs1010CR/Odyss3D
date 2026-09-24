"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartItem = {
  key: string;
  productId: string;
  name: string;
  price: number | null;
  image: string | null;
  color: string | null;
  qty: number;
};

type AddInput = {
  productId: string;
  name: string;
  price: number | null;
  image: string | null;
  color?: string | null;
  qty?: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  total: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (input: AddInput) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "odyss3-cubo-v1";

function load(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (it): it is CartItem =>
        !!it && typeof it.productId === "string" && typeof it.qty === "number" && it.qty > 0
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setItems(load());
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // almacenamiento no disponible
    }
  }, [items]);

  const value = useMemo<CartContextValue>(() => {
    const add = (input: AddInput) => {
      const key = `${input.productId}::${input.color ?? ""}`;
      setItems((prev) => {
        const existing = prev.find((it) => it.key === key);
        const qty = input.qty ?? 1;
        if (existing) {
          return prev.map((it) =>
            it.key === key ? { ...it, qty: it.qty + qty } : it
          );
        }
        return [
          ...prev,
          {
            key,
            productId: input.productId,
            name: input.name,
            price: input.price ?? null,
            image: input.image ?? null,
            color: input.color ?? null,
            qty,
          },
        ];
      });
    };

    return {
      items,
      count: items.reduce((s, it) => s + it.qty, 0),
      total: Math.round(items.reduce((s, it) => s + (it.price ?? 0) * it.qty, 0)),
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      add,
      setQty: (key, qty) =>
        setItems((prev) =>
          qty <= 0
            ? prev.filter((it) => it.key !== key)
            : prev.map((it) => (it.key === key ? { ...it, qty } : it))
        ),
      remove: (key) => setItems((prev) => prev.filter((it) => it.key !== key)),
      clear: () => setItems([]),
    };
  }, [items, isOpen]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}