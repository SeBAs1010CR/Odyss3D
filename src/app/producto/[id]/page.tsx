import { notFound } from "next/navigation";
import { listFilamentColorHexMap, listStoreProducts } from "@/lib/store/products";
import { ProductDetail } from "@/components/store/ProductDetail";

export const dynamic = "force-dynamic";

export default async function ProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [products, colorHex] = await Promise.all([
    listStoreProducts(),
    listFilamentColorHexMap(),
  ]);
  const product = products.find((p) => p.id === id) ?? null;
  if (!product) notFound();

  const similares = [
    ...products.filter((p) => p.id !== id && (p.category ?? "") === (product.category ?? "")),
    ...products.filter((p) => p.id !== id && (p.category ?? "") !== (product.category ?? "")),
  ].slice(0, 4);

  return <ProductDetail product={product} similares={similares} colorHex={colorHex} />;
}