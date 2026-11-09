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

      <motion.div className="hero-carousel" {...fadeUp(0.2)}>
        <ProductCarousel />
      </motion.div>
    </section>
  );
}
