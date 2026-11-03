"use client";

import Navbar from "../../components/Navbar";
import Products from "../../components/Products";
import Footer from "../../components/Footer";
import { CartProvider } from "../../lib/store/CartContext";
import { Cubo } from "../../components/store/Cubo";

export default function ProductosPage() {
  return (
    <CartProvider>
      <Navbar />
      <main style={{ paddingTop: 120 }}>
        <Products />
      </main>
      <Footer />
      <Cubo />
    </CartProvider>
  );
}
