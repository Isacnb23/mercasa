"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Award, Handshake, ShoppingCart } from "lucide-react";
import Reveal from "./Reveal";
import SeamArc from "./SeamArc";
import { brandNames, brandPillars } from "@/lib/data";
import { scrollToId } from "@/lib/utils";
import wallPhoto from "@/public/brand/marcas-wall.jpg";
import styles from "./BrandsSection.module.css";

const pillarIcons = {
  calidad: Award,
  alianzas: Handshake,
  compromiso: ShoppingCart,
} as const;

export default function BrandsSection() {
  return (
    <section id="marcas" className={`${styles.stage} scroll-mt-20`}>
      {/* ---------- Capa 1: foto real de la pared de marcas ---------- */}
      <motion.div
        initial={{ opacity: 0, x: 40, scale: 1.03 }}
        whileInView={{ opacity: 1, x: 0, scale: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className={styles.photo}
      >
        <Image
          src={wallPhoto}
          alt={`Muro de marcas distribuidas por Mercasa: ${brandNames.join(", ")}`}
          fill
          placeholder="blur"
          sizes="(max-width: 1023px) 100vw, 72vw"
        />
      </motion.div>

      {/* ---------- Capa 2: panel de texto ---------- */}
      <Reveal className={styles.panel}>
        <span className={styles.eyebrow}>Nuestro portafolio</span>

        <h2 className={styles.title}>
          Marcas que
          <em>construyen confianza</em>
        </h2>

        <p className={styles.lead}>
          Trabajamos con marcas líderes que garantizan calidad, innovación y
          bienestar para nuestros clientes.
        </p>

        <ul className={styles.pillarList}>
          {brandPillars.map((pillar, i) => {
            const Icon = pillarIcons[pillar.key as keyof typeof pillarIcons];
            return (
              <motion.li
                key={pillar.key}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.55, delay: 0.15 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                className={styles.pillarItem}
              >
                <span className={styles.pillarIcon}>
                  <Icon strokeWidth={1.7} aria-hidden />
                </span>
                <div>
                  <h3>{pillar.title}</h3>
                  <p>{pillar.description}</p>
                </div>
              </motion.li>
            );
          })}
        </ul>

        <button type="button" onClick={() => scrollToId("#contacto")} className={styles.cta}>
          Hablemos de su <strong>próximo pedido</strong>
          <span className={styles.arrow} aria-hidden>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </span>
        </button>
      </Reveal>

      {/* Ceja/arco que funde el cierre de Marcas con el inicio de Contacto */}
      <SeamArc className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-14 w-full" />
    </section>
  );
}
