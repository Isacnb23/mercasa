"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useScrollTo } from "@/lib/hooks/useScrollTo";

// Círculo blanco flotante centrado sobre la curva inferior del Hero, con el
// chevron animando muy lento (translateY 0→4px) — pura decoración de
// affordance de scroll, sin efectos exagerados.
export default function ScrollIndicator({
  target,
  label,
}: {
  target: string;
  label: string;
}) {
  const scrollTo = useScrollTo();

  return (
    <motion.button
      onClick={() => scrollTo(target)}
      aria-label={label}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.9 }}
      className="absolute bottom-2 left-1/2 z-20 hidden h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border border-[#D8E1EC] bg-white text-corp-blue shadow-[0_10px_28px_rgba(5,43,92,0.18)] transition hover:bg-white md:bottom-3 md:flex"
    >
      <motion.span
        animate={{ y: [0, 4, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        className="flex"
      >
        <ChevronDown className="h-5 w-5" strokeWidth={1.75} />
      </motion.span>
    </motion.button>
  );
}
