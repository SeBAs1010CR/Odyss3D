"use client";

import { motion } from "framer-motion";

const STATS = [
  { value: "FDM · SLA", label: "Tecnologías de impresión" },
  { value: "Precisión", label: "Tolerancias de fabricación" },
  { value: "Serie", label: "Producción de piezas finales" },
];

export default function About() {
  return (
    <section id="nosotros" className="section about">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8 }}
          className="about-statement"
        >
          <span className="section-eyebrow">Nosotros</span>
          <h2 className="about-title">
            Fabricación aditiva
            <br />
            con ingeniería detrás.
          </h2>
          <p className="section-subtitle">
            ODYSS3D es un taller de impresión 3D y fabricación de precisión.
            Convertimos ideas en piezas reales con procesos controlados,
            materiales confiables y entrega puntual.
          </p>
        </motion.div>

        <div className="about-stats">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="about-stat"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.12 }}
            >
              <span className="about-stat-value">{stat.value}</span>
              <span className="about-stat-label">{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
