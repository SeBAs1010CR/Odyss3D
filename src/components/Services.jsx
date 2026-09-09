"use client";

import { motion } from "framer-motion";

const SERVICES = [
  {
    title: "Impresión 3D",
    description:
      "FAB, SLA y multicolor. Materiales de alta resistencia con acabados de precisión.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      >
        <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" strokeLinejoin="round" />
        <path
          d="M12 12l8-4.5M12 12v9M12 12L4 7.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: "Diseño 3D",
    description:
      "Modelado paramétrico y orgánico. De tu boceto a un modelo listo para fabricar.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      >
        <path
          d="M12 2l8.5 5v10L12 22l-8.5-5V7L12 2z"
          strokeLinejoin="round"
        />
        <path
          d="M12 22V12M20.5 7L12 12M3.5 7l8.5 5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: "Prototipado",
    description:
      "Itera rápido: pruebas funcionales y validación de producto en días, no semanas.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      >
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4.5" />
        <path d="M12 3v-2M12 23v-2M3 12H1M23 12h-2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Fabricación",
    description:
      "Producción de piezas funcionales y series cortas. Calidad constante, hecho para durar.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      >
        <path
          d="M4 7h16M4 12h16M4 17h16M7 4v16M12 4v16M17 4v16"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export default function Services() {
  return (
    <section id="servicios" className="section services">
      <div className="container">
        <div className="services-head">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
          >
            <span className="section-eyebrow">Qué hacemos</span>
            <h2 className="section-title">Servicios</h2>
          </motion.div>
        </div>

        <div className="services-grid">
          {SERVICES.map((service, i) => (
            <motion.div
              key={service.title}
              className="service-card"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            >
              <div className="service-icon">{service.icon}</div>
              <h3 className="service-title">{service.title}</h3>
              <p className="service-text">{service.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
