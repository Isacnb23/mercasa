"use client";

import { ChevronRight } from "lucide-react";
import { navLinks } from "@/lib/data";
import { useScrollTo } from "@/lib/hooks/useScrollTo";

/* Mismo scroll suave que el navbar (ver Header.tsx): los links del footer
   apuntaban a anclas planas y dependían del salto instantáneo por defecto
   del navegador. */
export default function FooterNav({
  labels,
}: {
  labels: Record<"inicio" | "nosotros" | "logistica" | "productos" | "contacto", string>;
}) {
  const scrollTo = useScrollTo();

  return (
    <ul className="mt-5 flex flex-col gap-[17px] text-[15px] leading-none md:text-[16px]">
      {navLinks.map((link) => (
        <li key={link.href}>
          <a
            href={link.href}
            onClick={(e) => {
              e.preventDefault();
              scrollTo(link.href);
            }}
            className="group -my-[15px] inline-flex items-center gap-2 py-[15px] transition hover:text-[#075FD8]"
            style={{ color: "#3A4A5F" }}
          >
            <ChevronRight className="h-[14px] w-[14px] shrink-0 text-[#075FD8] transition group-hover:translate-x-0.5" />
            {labels[link.key as keyof typeof labels]}
          </a>
        </li>
      ))}
    </ul>
  );
}
