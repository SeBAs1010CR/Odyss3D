"use client";

import { lazy, Suspense } from "react";
import { motion } from "framer-motion";

const HeroScene = lazy(() => import("./HeroScene"));

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

      <Suspense fallback={null}>
        <HeroScene />
      </Suspense>

      <div className="container hero-content">
        <motion.img
          src="/images/branding/logo-horizontal.png?v=2"
          alt="ODYSS3D"
          className="hero-logo"
          {...fadeUp(0.05)}
        />

        <motion.h1 className="hero-title" {...fadeUp(0.2)}>
          Cuando la idea
          <span className="hero-accent"> toma forma.</span>
        </motion.h1>

        <motion.p className="hero-subtitle" {...fadeUp(0.35)}>
          Fabricamos tus ideas con impresión 3D, diseño, prototipado y
          fabricación de precisión. De la pantalla al objeto real.
        </motion.p>

        <motion.div className="hero-actions" {...fadeUp(0.5)}>
          <a href="#productos" className="btn btn-primary">
            Explorar productos
          </a>
          <a href="#servicios" className="btn btn-secondary">
            Conocer servicios
          </a>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 1 }}
        className="hero-scroll"
        aria-hidden
      >
        <span>Scroll</span>
        <div className="hero-scroll-line">
          <motion.span
            animate={{ y: ["-100%", "260%"] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </section>
  );
}
