"use client";

import { motion } from "framer-motion";
import ProductCarousel from "./ProductCarousel";

const fadeUp = (delay) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, delay, ease: "easeOut" },
});

export default function Hero() {
  return (
    <section id="inicio" className="hero">
      <div className="hero-grid" aria-hidden />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
        className="hero-glow"
        aria-hidden
      />

      <div className="container hero-content">
        <motion.img
          src="/images/branding/Logo%20sin%20fondo.png"
          alt="ODYSS3D"
          className="hero-logo"
          {...fadeUp(0.05)}
        />
      </div>

      <motion.div className="hero-carousel" {...fadeUp(0.2)}>
        <ProductCarousel />
      </motion.div>
    </section>
  );
}
