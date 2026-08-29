"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Globe2, Truck, Warehouse } from "lucide-react";
import { heroHighlights } from "@/lib/data";

const HIGHLIGHT_ICONS = {
  transito: Globe2,
  infraestructura: Warehouse,
  cobertura: Truck,
} as const;

// Mismo azul de marca para las 3 tarjetas — a propósito NINGUNA lleva acento
// naranja/amarillo, esta vez las 3 comparten idéntica paleta.
const ICON_BG = "#E3EEFC";
const ICON_COLOR = "#075FD8";

// Corrimiento horizontal sutil por tarjeta (pila vertical, no cascada
// diagonal): la 2da se desplaza levemente a la derecha, la 3ra levemente a
// la izquierda, para que la pila no se vea perfectamente alineada/rígida.
const OFFSETS = [0, 20, -5];

const EASE_CORP = [0.22, 0.61, 0.36, 1] as const;

function StatCard({
  itemKey,
  offset,
  delay,
}: {
  itemKey: keyof typeof HIGHLIGHT_ICONS;
  offset: number;
  delay: number;
}) {
  const t = useTranslations("Hero");
  const Icon = HIGHLIGHT_ICONS[itemKey];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: EASE_CORP }}
      style={{
        marginLeft: offset,
        backgroundColor: "rgba(255,255,255,0.97)",
        border: "1px solid rgba(10,55,110,0.06)",
        boxShadow: "0 20px 55px rgba(12,35,70,0.12)",
      }}
      className="w-[230px] rounded-[18px] p-4"
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: ICON_BG }}
        >
          <Icon className="h-5 w-5" style={{ color: ICON_COLOR }} strokeWidth={1.75} aria-hidden />
        </span>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            {t(`highlights.${itemKey}.label`)}
          </p>
          <p className="mt-1 text-[16px] font-bold leading-snug text-corp-ink">
            {t(`highlights.${itemKey}.value`)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function StatsCards({
  variant = "floating",
  className = "",
}: {
  variant?: "floating" | "stacked";
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-[19px] ${className}`}>
      {heroHighlights.map((item, i) => (
        <StatCard
          key={item.key}
          itemKey={item.key as keyof typeof HIGHLIGHT_ICONS}
          offset={variant === "floating" ? OFFSETS[i] : 0}
          delay={0.5 + i * 0.12}
        />
      ))}
    </div>
  );
}
