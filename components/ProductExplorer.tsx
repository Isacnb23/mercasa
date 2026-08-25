"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  GlassWater,
  HeartPulse,
  Package,
  Sparkles,
  UtensilsCrossed,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { HierarchyNode } from "@/lib/product-types";
import { cn, formatProductCount } from "@/lib/utils";
import Reveal from "./Reveal";

// Mismos colores del selector master-detail que ya existía en esta sección
// (distintos del corp-blue #075FD8 que usa el resto del sitio).
const ACCENT = "#185FA5";
const CHIP_BG = "#F0F5FA";

// Iconos por familia real de la API (keys = slug de HierarchyNode.id en el
// nivel 1, ver buildProductHierarchy en lib/mercasavip-catalog.ts). `Package`
// es el fallback genérico si el catálogo trae en el futuro una familia nueva
// sin ícono mapeado, para que la UI nunca se rompa por eso.
const FAMILY_ICONS: Record<string, LucideIcon> = {
  alimentos: UtensilsCrossed,
  bebidas: GlassWater,
  "cuidado-del-hogar": Sparkles,
  "cuidado-personal": HeartPulse,
  electronica: Zap,
};

export default function ProductExplorer({ families }: { families: HierarchyNode[] }) {
  const t = useTranslations("Products");
  const [activeFamilyId, setActiveFamilyId] = useState(families[0].id);
  const [activeSubFamilyId, setActiveSubFamilyId] = useState(families[0].children[0]?.id ?? "");
  // Vive acá (no dentro de CategoryAccordion) para poder resetearla al
  // mismo tiempo que la familia/sub-familia activa cambian, en vez de
  // depender del remount del acordeón: el acordeón siempre arranca cerrado
  // cuando se cambia de contexto, como pide el diseño.
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  const activeFamily = families.find((f) => f.id === activeFamilyId) ?? families[0];
  const resolvedSubFamilyId = activeFamily.children.some((sf) => sf.id === activeSubFamilyId)
    ? activeSubFamilyId
    : (activeFamily.children[0]?.id ?? "");
  const activeSubFamily = activeFamily.children.find((sf) => sf.id === resolvedSubFamilyId) ?? null;

  const handleSelectFamily = (id: string) => {
    setActiveFamilyId(id);
    const family = families.find((f) => f.id === id);
    setActiveSubFamilyId(family?.children[0]?.id ?? "");
    setExpandedCategoryId(null);
  };

  const handleSelectSubFamily = (id: string) => {
    setActiveSubFamilyId(id);
    setExpandedCategoryId(null);
  };

  return (
    <div className="mt-16 lg:mt-20">
      <Reveal className="flex items-center justify-center gap-4">
        <span
          className="whitespace-nowrap text-[12px] font-bold uppercase text-corp-blue"
          style={{ letterSpacing: "0.16em" }}
        >
          {t("familiesLabel")}
        </span>
      </Reveal>

      <Reveal delay={0.05} className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr] lg:gap-8">
        {/* Familias: fila de chips con scroll horizontal en mobile, columna en desktop */}
        <div className="flex gap-3 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {families.map((family) => (
            <FamilyListItem
              key={family.id}
              family={family}
              isActive={activeFamily.id === family.id}
              onSelect={() => handleSelectFamily(family.id)}
            />
          ))}
        </div>

        {/* Panel de detalle: el alto lo termina fijando el contenedor de
            categorías de más abajo (ver CategoryAccordion, h-[280px]) — acá
            solo queda el `layout` para que cualquier cambio de alto restante
            (ej. header de dos líneas en nombres de familia largos) anime
            suave en vez de saltar. */}
        <motion.div
          layout
          className="relative overflow-hidden rounded-[28px] border bg-white"
          style={{ borderColor: "#E2E8F0", boxShadow: "0 16px 44px rgba(16,37,63,0.08)" }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeFamily.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="p-6 sm:p-8"
            >
              <FamilyDetailHeader family={activeFamily} />

              {activeFamily.children.length > 0 && (
                <>
                  <p className="mt-6 text-[11px] font-bold uppercase" style={{ color: "#8493A5", letterSpacing: "0.1em" }}>
                    {t("subfamiliesLabel")}
                  </p>
                  <div className="mt-2.5 flex gap-3 overflow-x-auto pb-2">
                    {activeFamily.children.map((subFamily) => (
                      <SubFamilyCard
                        key={subFamily.id}
                        subFamily={subFamily}
                        isActive={activeSubFamily?.id === subFamily.id}
                        onSelect={() => handleSelectSubFamily(subFamily.id)}
                      />
                    ))}
                  </div>

                  <AnimatePresence mode="wait" initial={false}>
                    {activeSubFamily && (
                      <motion.div
                        key={activeSubFamily.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-5"
                      >
                        <CategoryAccordion
                          categories={activeSubFamily.children}
                          subFamilyName={activeSubFamily.name}
                          expandedId={expandedCategoryId}
                          onToggle={setExpandedCategoryId}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </Reveal>
    </div>
  );
}

function FamilyDetailHeader({ family }: { family: HierarchyNode }) {
  const t = useTranslations("Products");
  const Icon = FAMILY_ICONS[family.id] ?? Package;
  return (
    <div className="flex items-center gap-4">
      <span
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
        style={{ background: CHIP_BG }}
      >
        <Icon className="h-7 w-7" strokeWidth={1.75} style={{ color: ACCENT }} aria-hidden />
      </span>
      <div>
        <h3
          className="font-display text-corp-ink"
          style={{ fontSize: "clamp(20px, 2.2vw, 26px)", fontWeight: 600, lineHeight: 1.15 }}
        >
          {family.name}
        </h3>
        <p className="mt-1 text-[13px] font-medium" style={{ color: ACCENT }}>
          {t("productsCountApprox", { count: formatProductCount(family.itemCount) })}
        </p>
      </div>
    </div>
  );
}

function FamilyListItem({
  family,
  isActive,
  onSelect,
}: {
  family: HierarchyNode;
  isActive: boolean;
  onSelect: () => void;
}) {
  const t = useTranslations("Products");
  const Icon = FAMILY_ICONS[family.id] ?? Package;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isActive}
      className={cn(
        "flex min-h-[52px] shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-left transition duration-300 lg:min-h-[64px] lg:w-full",
        isActive ? "shadow-[0_10px_26px_rgba(24,95,165,0.28)]" : "border border-[#E2E8F0] bg-white hover:border-[#185FA5]/30"
      )}
      style={{ background: isActive ? ACCENT : undefined }}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors duration-300"
        style={{
          background: isActive ? "rgba(255,255,255,0.18)" : CHIP_BG,
          color: isActive ? "#ffffff" : ACCENT,
        }}
      >
        <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden />
      </span>
      <span className="flex min-w-0 flex-col">
        <span
          className="whitespace-nowrap text-[14.5px] font-semibold"
          style={{ color: isActive ? "#ffffff" : "#0c1a26" }}
        >
          {family.name}
        </span>
        <span
          className="whitespace-nowrap text-[12px] font-medium"
          style={{ color: isActive ? "rgba(255,255,255,0.85)" : "#5C6B7D" }}
        >
          {t("productsCountApprox", { count: formatProductCount(family.itemCount) })}
        </span>
      </span>
    </button>
  );
}

// Mini-tarjeta de sub-familia: nombre + cantidad en dos líneas, siempre en
// fila con scroll horizontal (desktop y mobile), a diferencia de la columna
// de familias que sí cambia de layout por breakpoint.
function SubFamilyCard({
  subFamily,
  isActive,
  onSelect,
}: {
  subFamily: HierarchyNode;
  isActive: boolean;
  onSelect: () => void;
}) {
  const t = useTranslations("Products");

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isActive}
      className={cn(
        "flex min-w-[136px] shrink-0 flex-col gap-1 rounded-2xl px-4 py-3 text-left transition duration-300",
        isActive ? "shadow-[0_10px_26px_rgba(24,95,165,0.28)]" : "border border-[#E2E8F0] bg-white hover:border-[#185FA5]/30"
      )}
      style={{ background: isActive ? ACCENT : undefined }}
    >
      <span
        className="whitespace-nowrap text-[13.5px] font-semibold"
        style={{ color: isActive ? "#ffffff" : "#0c1a26" }}
      >
        {subFamily.name}
      </span>
      <span
        className="whitespace-nowrap text-[11.5px] font-medium"
        style={{ color: isActive ? "rgba(255,255,255,0.85)" : "#5C6B7D" }}
      >
        {t("productsCount", { count: subFamily.itemCount })}
      </span>
    </button>
  );
}

// Acordeón de categorías: todas las filas tienen el mismo tratamiento
// (nombre + cantidad + borde). El chevron solo aparece cuando hay algo real
// para expandir (sub-categorías, o en el futuro tamaños de empaque).
//
// El estado de expansión vive en ProductExplorer (no acá adentro): así el
// padre puede cerrarlo explícitamente ANTES de cambiar de familia/sub-familia
// (ver handleSelectFamily/handleSelectSubFamily), cumpliendo el requisito de
// que el acordeón siempre arranque colapsado al cambiar de contexto.
function CategoryAccordion({
  categories,
  subFamilyName,
  expandedId,
  onToggle,
}: {
  categories: HierarchyNode[];
  subFamilyName: string;
  expandedId: string | null;
  onToggle: (id: string | null) => void;
}) {
  const t = useTranslations("Products");

  return (
    <div>
      <p className="text-[11px] font-bold uppercase" style={{ color: "#8493A5", letterSpacing: "0.1em" }}>
        {t("categoriesInLabel", { subFamilyName })}
      </p>
      {/* Alto FIJO (no solo un tope): antes esto era max-h-420, así que
          familias con pocas categorías (ej. Cuidado Personal, 1 categoría)
          dejaban un panel mucho más bajo que familias con muchas (ej.
          Alimentos, 14 → llenaba el tope de 420px), y el panel entero
          saltaba de tamaño al cambiar de familia. Calibrado con Bebidas (5
          categorías en su primera sub-familia) como caso típico/mediano —
          ni el extremo más chico (Cuidado Personal, 1) ni el más grande
          (Alimentos, 14). Categorías de más siguen scrolleando adentro,
          categorías de menos dejan espacio vacío abajo — en ambos casos el
          panel completo (ver `layout` en el contenedor de arriba) mantiene
          el mismo alto. */}
      <div className="mt-2.5 h-[280px] space-y-2 overflow-y-auto pr-1">
        {categories.map((category) => (
          <CategoryAccordionRow
            key={category.id}
            category={category}
            isExpanded={expandedId === category.id}
            onToggle={() => onToggle(expandedId === category.id ? null : category.id)}
          />
        ))}
      </div>
    </div>
  );
}

function CategoryAccordionRow({
  category,
  isExpanded,
  onToggle,
}: {
  category: HierarchyNode;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations("Products");
  // Cuando la categoría tiene una sola sub-categoría con el mismo nombre
  // (Hierarchy3 == Hierarchy4, ej. "Helados" -> "Helados"), no suma
  // información — es puro ruido repetido en la vista.
  const isRedundantSingleChild =
    category.children.length === 1 &&
    category.children[0].name.toLowerCase() === category.name.toLowerCase();
  const subCategories = isRedundantSingleChild ? [] : category.children;
  const hasPackSizes = (category.packSizes?.length ?? 0) > 0;
  const isExpandable = subCategories.length > 0 || hasPackSizes;

  return (
    <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "#E2E8F0" }}>
      <button
        type="button"
        onClick={isExpandable ? onToggle : undefined}
        aria-expanded={isExpandable ? isExpanded : undefined}
        disabled={!isExpandable}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left disabled:cursor-default"
      >
        <span className="text-[14px] font-semibold text-corp-ink">{category.name}</span>
        <span className="flex shrink-0 items-center gap-2.5">
          <span className="text-[12px] font-medium" style={{ color: "#5C6B7D" }}>
            {t("productsCount", { count: category.itemCount })}
          </span>
          {isExpandable && (
            <ChevronDown
              className={cn("h-4 w-4 transition-transform duration-300", isExpanded && "rotate-180")}
              style={{ color: ACCENT }}
              aria-hidden
            />
          )}
        </span>
      </button>

      {/* Sin AnimatePresence acá a propósito: el contenido queda siempre
          montado y solo se anima su `height`/`opacity` vía `animate`. Evita
          anidar un AnimatePresence propio de esta fila dentro del panel que
          arriba se reemplaza por completo (mode="wait" en ProductExplorer
          al cambiar de familia/sub-familia) — más simple y sin depender de
          que la animación de esta fila termine para que el panel de arriba
          pueda completar la suya. */}
      {isExpandable && (
        <motion.div
          initial={false}
          animate={isExpanded ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          style={{ overflow: "hidden" }}
        >
          {subCategories.length > 0 && (
            <div className="flex flex-wrap gap-2 px-4 pb-3 pt-1">
              {subCategories.map((subCategory) => (
                <span
                  key={subCategory.id}
                  className="rounded-full px-3 py-1 text-[12px] font-medium"
                  style={{ background: CHIP_BG, color: ACCENT }}
                >
                  {subCategory.name}
                </span>
              ))}
            </div>
          )}

          {hasPackSizes && (
            <p className="px-4 pb-3 text-[11.5px] font-medium" style={{ color: ACCENT }}>
              {t("packSizesLabel")}: {category.packSizes!.join(" · ")}
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}
