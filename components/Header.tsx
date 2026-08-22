"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { navLinks } from "@/lib/data";
import { cn } from "@/lib/utils";
import { useScrollTo } from "@/lib/hooks/useScrollTo";
import logo from "@/public/models/mercasa-logo-transparent.png";
import isotype from "@/public/favicon/icon-responsive.png";
import LocaleSwitcher from "./LocaleSwitcher";
import RecruitmentPopover from "./RecruitmentPopover";

export default function Header() {
  const t = useTranslations("Header");
  const tNav = useTranslations("Nav");
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeHref, setActiveHref] = useState("#inicio");
  const scrollTo = useScrollTo();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Click-outside (mousedown/touchstart) + Escape cierran el menú mobile. La
  // ref apunta SOLO al panel desplegable (no a todo el header) para que un
  // click sobre el logo/isotipo o el selector es/en en la barra superior
  // también cuente como "afuera" y cierre el menú; el botón hamburguesa se
  // excluye aparte porque su propio onClick ya maneja el toggle.
  useEffect(() => {
    if (!open) return;

    const handlePointer = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  // Bloquea el scroll del body mientras el menú está abierto.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll-spy: mantiene el subrayado activo sincronizado con la sección
  // realmente visible, sea que el usuario haya llegado ahí con un click en
  // el navbar/footer o simplemente scrolleando. La franja de detección
  // (rootMargin) es angosta y arranca justo debajo del navbar fijo, así la
  // sección "activa" es la que ocupa esa banda, no la que apenas asoma abajo.
  useEffect(() => {
    const sections = navLinks
      .map((link) => document.querySelector(link.href))
      .filter((el): el is Element => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveHref(`#${entry.target.id}`);
        });
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const handleNav = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    setOpen(false);
    setActiveHref(href);
    scrollTo(href);
  };

  const linkClass = (href: string) => cn("group relative rounded-full px-4 py-2 font-display text-[14.5px] font-medium tracking-wide transition-colors duration-300 hover:bg-corp-blue/[0.06]", activeHref === href ? "text-corp-blue" : "text-corp-ink/75 hover:text-corp-blue");

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-5 md:pt-4">
      <div className={cn("relative z-20 mx-auto max-w-[1320px] rounded-[24px] bg-white transition-shadow duration-500", scrolled ? "shadow-[0_18px_48px_-16px_rgba(8,43,92,0.28)]" : "shadow-[0_10px_32px_-14px_rgba(8,43,92,0.16)]")} style={{ border: "1px solid #E8ECF1" }}>
        <div className="relative grid h-[72px] grid-cols-[auto_1fr_auto] items-center gap-4 px-5 md:h-[78px] md:px-7">

          <a href="#inicio" onClick={(e) => handleNav(e, "#inicio")} aria-label={t("logoAria")} className="flex h-11 w-11 shrink-0 items-center transition active:scale-95 sm:h-auto sm:w-auto">
            <Image src={isotype} alt="Mercasa" priority className="h-11 w-11 rounded-[10px] sm:hidden" />
            <Image src={logo} alt="Mercasa" priority className="hidden h-9 w-auto sm:block md:h-10" />
          </a>

          <nav className="hidden items-center justify-center gap-1 md:flex">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} onClick={(e) => handleNav(e, link.href)} className={linkClass(link.href)}>{tNav(link.key as "inicio" | "nosotros" | "logistica" | "productos" | "contacto")}<span className={cn("absolute -bottom-[1px] left-1/2 h-[2px] w-0 -translate-x-1/2 rounded-full bg-corp-blue transition-all duration-300", activeHref === link.href ? "w-6" : "group-hover:w-6")} /></a>
            ))}
          </nav>

          <div className="col-start-3 flex items-center justify-end gap-3">
            <div className="hidden md:flex">
              <RecruitmentPopover variant="desktop" />
            </div>
            <LocaleSwitcher />
            <button ref={triggerRef} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-corp-ink transition hover:bg-corp-ink/[0.06] md:hidden" aria-label={open ? t("closeMenu") : t("openMenu")} onClick={() => setOpen((v) => !v)}>{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="fixed inset-0 z-10 bg-corp-ink/40 md:hidden"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.div
              key="panel"
              ref={panelRef}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
              className="relative z-20 mx-auto mt-2 max-w-[1320px] overflow-hidden rounded-[20px] bg-white shadow-[0_16px_40px_-8px_rgba(8,43,92,0.16)] md:hidden"
              style={{ border: "1px solid #E8ECF1" }}
            >
              <div className="flex flex-col gap-1 p-3">
                {navLinks.map((link) => (
                  <a key={link.href} href={link.href} onClick={(e) => handleNav(e, link.href)} className={cn("rounded-2xl px-4 py-3 text-base font-medium transition", activeHref === link.href ? "bg-corp-blue/[0.06] text-corp-blue" : "text-corp-ink hover:bg-corp-ink/[0.05]")}>{tNav(link.key as "inicio" | "nosotros" | "logistica" | "productos" | "contacto")}</a>
                ))}
                <RecruitmentPopover variant="mobile" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}