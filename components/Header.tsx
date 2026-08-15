"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { ArrowRight, Menu, X } from "lucide-react";
import { navLinks } from "@/lib/data";
import { cn, scrollToId } from "@/lib/utils";
import logo from "@/public/brand/mercasa-logo-white.png";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNav = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    setOpen(false);
    scrollToId(href);
  };

  const linkClass =
    "group relative font-display text-[14px] font-medium tracking-wide text-mist-100/80 transition [text-shadow:0_1px_3px_rgba(0,0,0,0.35)] hover:text-white";

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Vidrio sobrio: transparente sobre el hero, se define al hacer scroll */}
      <div
        className={cn(
          "relative w-full border-b transition-all duration-500",
          scrolled
            ? "border-white/10 bg-ink/80 shadow-[0_12px_32px_-14px_rgba(0,0,0,0.6)] backdrop-blur-xl backdrop-saturate-150"
            : "border-transparent bg-transparent"
        )}
      >
        <div className="relative mx-auto grid max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-4 md:px-8">
          {/* Logo (left) */}
          <a
            href="#inicio"
            onClick={(e) => handleNav(e, "#inicio")}
            aria-label="Mercasa — Inicio"
            className="flex shrink-0 items-center transition active:scale-95"
          >
            <Image src={logo} alt="Mercasa" priority className="h-7 w-auto md:h-8" />
          </a>

          {/* Nav links (desktop, centered) */}
          <nav className="hidden items-center justify-center gap-9 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNav(e, link.href)}
                className={linkClass}
              >
                {link.label}
                <span className="absolute -bottom-2 left-1/2 h-px w-0 -translate-x-1/2 bg-teal-400 transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </nav>

          {/* Right: CTA (desktop) + hamburger (mobile) */}
          <div className="col-start-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => scrollToId("#contacto")}
              className="group hidden items-center gap-2 rounded-full px-6 py-2.5 text-[13px] font-semibold text-white transition duration-300 hover:-translate-y-px hover:brightness-110 md:inline-flex"
              style={{
                background: "linear-gradient(135deg, #2F80ED 0%, #4A8DFF 100%)",
                boxShadow:
                  "0 10px 26px -10px rgba(47,128,237,0.85), inset 0 0 0 1px rgba(120,170,255,0.28)",
              }}
            >
              Hágase Cliente
              <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </button>

            <button
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition hover:bg-white/10 md:hidden"
              aria-label={open ? "Cerrar menú" : "Abrir menú"}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="absolute inset-x-0 top-full overflow-hidden border-b border-white/10 bg-ink/95 shadow-[0_16px_40px_-8px_rgba(6,15,24,0.7)] backdrop-blur-2xl backdrop-saturate-150 md:hidden"
          >
            <div className="flex flex-col gap-1 p-3">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNav(e, link.href)}
                  className="rounded-2xl px-4 py-3 text-base font-medium text-white/90 transition hover:bg-white/10"
                >
                  {link.label}
                </a>
              ))}
              <button
                type="button"
                onClick={(e) => handleNav(e, "#contacto")}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-teal-400 to-teal-500 px-5 py-3 text-sm font-semibold text-navy-950"
              >
                Hágase Cliente
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
