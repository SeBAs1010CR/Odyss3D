import { motion } from "framer-motion";

export default function CTASection() {
  return (
    <section id="contacto" className="section cta">
      <div className="cta-line" aria-hidden />
      <div className="container cta-inner">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8 }}
          className="cta-content"
        >
          <h2 className="cta-title">
            ¿Tienes una idea?
            <span className="cta-sub">Nosotros le damos forma.</span>
          </h2>
          <p className="cta-text">
            Cuéntanos qué necesitas fabricar y te respondemos con una
            propuesta clara.
          </p>
          <a href="#contacto" className="btn btn-primary cta-btn">
            Solicitar cotización
          </a>
        </motion.div>
      </div>
    </section>
  );
}