"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

const INTERVAL_MS = 2000;
const MAX_SLIDES = 8;

function resolveImage(src) {
  if (!src) return null;
  if (/^(https?:)?\//.test(src)) return src;
  return `/images/products/${src}`;
}

export default function ProductCarousel() {
  const [slides, setSlides] = useState([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!Array.isArray(data)) return;
        setSlides(data.filter((p) => p.image && p.name).slice(0, MAX_SLIDES));
      })
      .catch(() => setSlides([]));
  }, []);

  useEffect(() => {
    if (slides.length < 2 || paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), INTERVAL_MS);
    return () => clearInterval(id);
  }, [slides.length, paused]);

  if (slides.length === 0) return null;

  const go = (step) => setIndex((i) => (i + step + slides.length) % slides.length);

  return (
    <section
      className="carousel"
      aria-roledescription="carrusel"
      aria-label="Productos destacados"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((p, i) => (
        <div
          key={p.id ?? p.name}
          className={`carousel-slide${i === index ? " active" : ""}`}
          aria-hidden={i !== index}
        >
          <img src={resolveImage(p.image)} alt={p.name} loading={i === 0 ? "eager" : "lazy"} />
          <div className="carousel-caption">
            {p.category && <span className="carousel-category">{p.category}</span>}
            <h2 className="carousel-name">{p.name}</h2>
            <div className="carousel-meta">
              {p.price && <span className="carousel-price">{p.price}</span>}
              {p.id && (
                <Link href={`/producto/${p.id}`} className="btn btn-primary">
                  Ver producto
                </Link>
              )}
            </div>
          </div>
        </div>
      ))}

      {slides.length > 1 && (
        <>
          <button
            type="button"
            className="carousel-nav carousel-prev"
            onClick={() => go(-1)}
            aria-label="Anterior"
          >
            <ChevronLeft size={26} />
          </button>
          <button
            type="button"
            className="carousel-nav carousel-next"
            onClick={() => go(1)}
            aria-label="Siguiente"
          >
            <ChevronRight size={26} />
          </button>
          <div className="carousel-dots">
            {slides.map((p, i) => (
              <button
                key={p.id ?? p.name}
                type="button"
                className={`carousel-dot${i === index ? " active" : ""}`}
                onClick={() => setIndex(i)}
                aria-label={`Ir al producto ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
