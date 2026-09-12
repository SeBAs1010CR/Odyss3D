"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "@/components/admin/ProductForm";
import { Btn } from "@/components/admin/ui";

export default function NewProductPage() {
  const router = useRouter();

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">Nuevo producto</h1>
          <p className="admin-page-sub">Agrega un producto al catálogo interno</p>
        </div>
        <div className="admin-page-actions">
          <Btn variant="ghost" onClick={() => router.back()}>
            <ArrowLeft /> Volver
          </Btn>
        </div>
      </div>

      <ProductForm
        onSaved={(id) => {
          router.replace(`/admin/products/${id}`);
          router.refresh();
        }}
      />
    </>
  );
}