"use client";

import Navbar from "../../components/Navbar";
import Services from "../../components/Services";
import Footer from "../../components/Footer";
import { CartProvider } from "../../lib/store/CartContext";
import { Cubo } from "../../components/store/Cubo";

export default function ServiciosPage() {
  return (
    <CartProvider>
      <Navbar />
      <main>
        <img
          src="/images/branding/Logo%20sin%20fondo.png"
          alt="ODYSS3D"
          className="page-logo"
        />
        <Services />
      </main>
      <Footer />
      <Cubo />
    </CartProvider>
  );
}
