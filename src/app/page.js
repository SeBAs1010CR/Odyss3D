"use client";

import dynamic from "next/dynamic";
import Navbar from "../components/Navbar";
import Products from "../components/Products";
import Services from "../components/Services";
import About from "../components/About";
import CTASection from "../components/CTASection";
import Footer from "../components/Footer";
import { CartProvider } from "../lib/store/CartContext";
import { Cubo } from "../components/store/Cubo";

const Hero = dynamic(() => import("../components/Hero"), { ssr: false });

export default function Home() {
  return (
    <CartProvider>
      <Navbar />
      <main>
        <Hero />
        <Products />
        <Services />
        <About />
        <CTASection />
      </main>
      <Footer />
      <Cubo />
    </CartProvider>
  );
}
