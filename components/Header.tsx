"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { navLinks } from "@/lib/data";
import { cn, scrollToId } from "@/lib/utils";
import logo from "@/public/models/mercasa-logo-transparent.png";
import LocaleSwitcher from "./LocaleSwitcher";
import RecruitmentPopover from "./RecruitmentPopover";

export default function Header() {
  const t = useTranslations("Header");
  const tNav = useTranslations("Nav");
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeHref, setActiveHref] = useState("#inicio");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNav = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    setOpen(false);
    setActiveHref(href);
    scrollToId(href);
  };

  const linkClass = (href: string) => cn("group relative rounded-full px-4 py-2 font-display text-[14.5px] font-medium tracking-wide transition-colors duration-300 hover:bg-corp-blue/[0.06]", activeHref === href ? "text-corp-blue" : "text-corp-ink/75 hover:text-corp-blue");

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-5 md:pt-4">
      <div className={cn("relative mx-auto max-w-[1320px] rounded-[24px] bg-white transition-shadow duration-500", scrolled ? "shadow-[0_18px_48px_-16px_rgba(8,43,92,0.28)]" : "shadow-[0_10px_32px_-14px_rgba(8,43,92,0.16)]")} style={{ border: "1px solid #E8ECF1" }}>
        <div className="relative grid h-[72px] grid-cols-[auto_1fr_auto] items-center gap-4 px-5 md:h-[78px] md:px-7">

          <a href="#inicio" onClick={(e) => handleNav(e, "#inicio")} aria-label={t("logoAria")} className="flex shrink-0 items-center transition active:scale-95"><Image src={logo} alt="Mercasa" priority className="h-9 w-auto md:h-10" /></a>

          <nav className="hidden items-center justify-center gap-1 md:flex">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} onClick={(e) => handleNav(e, link.href)} className={linkClass(link.href)}>{tNav(link.key as "inicio" | "nosotros" | "logistica" | "marcas" | "contacto")}<span className={cn("absolute -bottom-[1px] left-1/2 h-[2px] w-0 -translate-x-1/2 rounded-full bg-corp-blue transition-all duration-300", activeHref === link.href ? "w-6" : "group-hover:w-6")} /></a>
            ))}
          </nav>

          <div className="col-start-3 flex items-center justify-end gap-3">
            <RecruitmentPopover variant="desktop" />
            <LocaleSwitcher />
            <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-corp-ink transition hover:bg-corp-ink/[0.06] md:hidden" aria-label={open ? t("closeMenu") : t("openMenu")} onClick={() => setOpen((v) => !v)}>{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }} className="relative mx-auto mt-2 max-w-[1320px] overflow-hidden rounded-[20px] bg-white shadow-[0_16px_40px_-8px_rgba(8,43,92,0.16)] md:hidden" style={{ border: "1px solid #E8ECF1" }}>
            <div className="flex flex-col gap-1 p-3">
              {navLinks.map((link) => (
                <a key={link.href} href={link.href} onClick={(e) => handleNav(e, link.href)} className={cn("rounded-2xl px-4 py-3 text-base font-medium transition", activeHref === link.href ? "bg-corp-blue/[0.06] text-corp-blue" : "text-corp-ink hover:bg-corp-ink/[0.05]")}>{tNav(link.key as "inicio" | "nosotros" | "logistica" | "marcas" | "contacto")}</a>
              ))}
              <RecruitmentPopover variant="mobile" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}