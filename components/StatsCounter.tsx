"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, animate } from "framer-motion";
import { Boxes, Building2, Globe2, PackageCheck, Truck, Warehouse } from "lucide-react";
import { stats } from "@/lib/data";

const icons = [Boxes, Warehouse, Building2, Globe2, PackageCheck, Truck];

function Counter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 1.8,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value]);

  return (
    <span ref={ref} className="font-display tabular-nums">
      {display.toLocaleString("es-CR")}
      {suffix}
    </span>
  );
}

export default function StatsCounter() {
  return (
    <section id="metricas" className="relative bg-navy-900 py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl bg-white/5 md:grid-cols-3 lg:grid-cols-6">
          {stats.map((stat, i) => {
            const Icon = icons[i % icons.length];
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className="flex flex-col gap-3 bg-navy-900 p-6"
              >
                <Icon className="h-5 w-5 text-teal-400" />
                <p className="text-2xl font-semibold text-white sm:text-3xl">
                  <Counter value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-xs leading-snug text-mist-200/60">
                  {stat.label}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
