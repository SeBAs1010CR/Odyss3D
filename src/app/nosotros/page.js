"use client";

import Navbar from "../../components/Navbar";
import About from "../../components/About";
import Footer from "../../components/Footer";
import { CartProvider } from "../../lib/store/CartContext";
import { Cubo } from "../../components/store/Cubo";

export default function NosotrosPage() {
  return (
    <CartProvider>
      <Navbar />
      <main>
        <img
          src="/images/branding/Logo%20sin%20fondo.png"
          alt="ODYSS3D"
          className="page-logo"
        />
        <About />
      </main>
      <Footer />
      <Cubo />
    </CartProvider>
  );
}
