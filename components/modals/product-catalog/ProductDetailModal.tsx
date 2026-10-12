"use client";

import { useEffect, useRef, useState } from "react";
import { ImageOff, Minus, Plus, ShoppingCart, Store, X, type LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ProductSummary } from "@/lib/product-types";
import { useCart } from "@/lib/cart-context";
import type { CartChannel } from "@/lib/cart-types";
import ProductImage from "./ProductImage";
import PriceTag from "./PriceTag";
import PresentationPanel, { type PanelLabels } from "./PresentationPanel";
import type { PickupPriceView, PriceView } from "@/lib/catalog-prices";
import { formatColones } from "@/lib/checkout-format";
import { productTitle } from "@/lib/product-display";
import { pickInitialUnit, sortUnits, unitName } from "@/lib/presentations";
import { useCatalogUnits } from "@/lib/hooks/useCatalogUnits";
import { canAddToCart } from "@/lib/catalog-channel";
import { ChannelAvailability } from "./ChannelBadges";

// Feature simple (ver catalogo-detalle-producto.md): lightbox de un solo
// producto ENCIMA del catálogo (no reemplaza el flipbook, no navega a otra
// ruta) — se monta/desmonta por su cuenta desde ProductCatalogModal, sin
// tocar `currentPage` del libro, así cerrar vuelve exacto a la misma
// página. Fuera de alcance a propósito (ver el doc): sin prev/next entre
// productos, sin zoom interactivo, sin mostrar familia/sub-familia acá.

const INK = "#082B5C";
const MUTED = "#8493A5";
// Texto secundario legible (contraste AA sobre blanco); MUTED queda para etiquetas y detalles.
const TEXT_SOFT = "#5C6B7D";
const RULE = "#E2E8F0";
const CHIP_BG = "#F4F6F9";

export default function ProductDetailModal({
  product,
  icon,
  price,
  pickupPrice,
  onClose,
}: {
  product: ProductSummary;
  icon: LucideIcon;
  price: PriceView;
  /** Precio de Retiro en tienda (por separado del de domicilio). */
  pickupPrice: PickupPriceView;
  onClose: () => void;
}) {
  const t = useTranslations("Products");
  const tCart = useTranslations("Cart");
  const locale = useLocale();
  const [imageStatus, setImageStatus] = useState<"loading" | "loaded" | "error">("loading");
  // Solo para MOSTRAR: el nombre original (product.name) es el que va al carrito y al servidor. El título es el
  // nombre comercial sin el sufijo de empaque ("24U/C 60C/T"), que sugiere presentaciones que pueden no existir.
  const { title, packagingText } = productTitle(product.name);

  const { addItem } = useCart();
  // Fase 2: cada canal en que se consigue el producto tiene su botón de agregar (domicilio y/o retiro en tienda). Las
  // presentaciones (unidad, caja, tarima) siguen siendo las de domicilio; el retiro agrega la presentación por defecto.
  const deliverable = canAddToCart(product, "delivery");
  const pickupable = canAddToCart(product, "pickup");
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState<CartChannel | null>(null);

  // Presentaciones vendibles (solo con sesión). El modal abre con la MISMA presentación que muestra la tarjeta
  // (la unidad del listado). Si esa unidad no estuviera entre las presentaciones, no se ofrece selector y se
  // conserva el precio de la tarjeta: nunca se abre con otra presentación.
  const { status: unitsStatus, unitsFor } = useCatalogUnits(deliverable ? [product.id] : []);
  const rawUnits = unitsFor(product.id);
  const listingUnit = price.kind === "price" ? price.unit : null;
  const initialUnit = pickInitialUnit(rawUnits, listingUnit);
  const units = rawUnits && (initialUnit || !listingUnit) ? sortUnits(rawUnits) : null;
  const [chosenUnit, setChosenUnit] = useState<string | null>(null);
  const selected = units?.find((u) => u.unitId === chosenUnit) ?? initialUnit ?? null;
  const quantityUnit = selected?.unitId ?? (price.kind === "price" ? price.unit : "");

  // El sufijo de empaque del nombre solo se muestra (como dato informativo) cuando NO hay presentaciones reales
  // que lo reemplacen, y nunca como si fuera una presentación disponible.
  const showNamePackaging = !!packagingText && (!units || units.length <= 1);

  // Foco inicial en el botón de cerrar (Escape lo maneja ProductCatalogModal).
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  const handleAddToCart = (channel: CartChannel) => {
    if (!canAddToCart(product, channel)) return;
    // La presentación por defecto no se guarda: así una misma presentación nunca queda en dos líneas.
    const unit = channel === "delivery" && selected && !selected.isDefault ? selected.unitId : undefined;
    addItem(product, quantity, unit, channel);
    setJustAdded(channel);
    setQuantity(1);
    setTimeout(() => setJustAdded(null), 1800);
  };

  const labels: PanelLabels = {
    selector: t("catalog.unitSelectorLabel"),
    equivalenceTitle: t("catalog.equivalenceTitle"),
    vat: t("catalog.priceVatSuffix"),
    priceVatIncluded: (priceText) => t("catalog.priceVatIncluded", { price: priceText }),
    perUnit: (unit) => t("catalog.priceUnit", { unit }),
    approx: (priceText, unit) => t("catalog.approxPerUnit", { price: priceText, unit }),
    equivalence: (big, amount, small) => t("catalog.equivalenceLine", { big, amount, small }),
    soldBy: (unit) => t("catalog.soldBy", { unit }),
  };

  return (
    <div
      // z-index por encima de `.catalog-backdrop`/`.catalog-panel` (z-index:
      // 100 en product-catalog-overlay.css) — con un z-[70] el detalle
      // quedaba montado en el DOM con opacidad correcta pero VISUALMENTE
      // detrás del catálogo (confirmado con captura real, no solo revisando
      // el código — esto ya había fallado antes con este mismo componente).
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6"
      style={{ background: "rgba(8,20,40,0.55)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("catalog.productDetailAriaLabel", { name: title })}
        className="pd-dialog relative rounded-[24px] bg-white shadow-[0_30px_80px_rgba(8,20,40,0.35)]"
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label={t("catalog.close")}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 outline-none transition hover:bg-white focus-visible:ring-2 focus-visible:ring-[#075FD8] focus-visible:ring-offset-2"
          style={{ boxShadow: "0 4px 12px rgba(8,20,40,0.18)" }}
        >
          <X className="h-4 w-4" strokeWidth={2} style={{ color: INK }} aria-hidden />
        </button>

        {/* Foto grande — misma fuente que las miniaturas (/api/product-images,
            tabla Arte + SharePoint), solo en tamaño "l". Caja de alto acotado
            (min(40dvh, 420px), ver .pd-media) para que no empuje el botón de
            agregar fuera de pantalla en laptops bajas; object-contain. */}
        <div className="pd-media flex items-center justify-center" style={{ background: CHIP_BG }}>
          <div className="absolute inset-0">
            <ProductImage
              itemId={product.id}
              name={title}
              familyIcon={icon}
              size="l"
              className="h-full w-full object-contain p-4"
              errorIconClassName="h-16 w-16"
              onStatusChange={setImageStatus}
            />
          </div>
          {imageStatus === "error" && (
            <div className="pointer-events-none absolute inset-x-0 bottom-4 flex flex-col items-center gap-1.5">
              <ImageOff className="h-4 w-4" strokeWidth={1.8} style={{ color: MUTED }} aria-hidden />
              <span className="text-[13px] font-semibold" style={{ color: MUTED }}>
                {t("catalog.productDetailPhotoNotAvailable")}
              </span>
            </div>
          )}
        </div>

        <div className="pd-main">
          {/* Zonas con aire: título, precio, presentación, equivalencias. Scroll interno si no entra; la barra de
              cantidad/agregar queda fuera de esta zona y SIEMPRE visible. */}
          <div className="pd-info flex flex-col gap-5 p-5 sm:p-6" data-lenis-prevent>
            <div className="flex flex-col gap-1.5">
              {/* Título: la misma sans-serif de las tarjetas (no la serif de display), peso 600, interlineado
                  cómodo y balanceado. Solo el nombre comercial, normalizado para mostrar. */}
              <h2
                className="font-sans text-[clamp(17px,2.4dvh,20px)] font-semibold leading-[1.3]"
                style={{ color: INK, textWrap: "balance", overflowWrap: "anywhere" }}
              >
                {title}
              </h2>
              {showNamePackaging && (
                <p className="text-[12.5px] leading-snug" style={{ color: TEXT_SOFT }}>
                  {t("catalog.packagingFromNameLine", { codes: packagingText })}
                </p>
              )}
            </div>

            {units && selected ? (
              <PresentationPanel
                units={units}
                selectedUnitId={selected.unitId}
                onSelect={setChosenUnit}
                locale={locale}
                formatPrice={(amount) => formatColones(amount, locale, 2)}
                formatTotal={(amount) => formatColones(amount, locale)}
                labels={labels}
              />
            ) : unitsStatus === "loading" && price.kind !== "hidden" ? (
              // Con sesión, mientras llegan las presentaciones: reserva de espacio (sin saltos al cargar).
              <div className="flex flex-col gap-3" aria-hidden>
                <PriceTag view={price} size="detail" />
                <div className="h-[76px] rounded-2xl motion-safe:animate-pulse" style={{ background: "rgba(8, 43, 92, 0.06)" }} />
              </div>
            ) : deliverable ? (
              <PriceTag view={price} size="detail" />
            ) : null}

            <ChannelAvailability availability={product.availability} deliveryPrice={price} pickupPrice={pickupPrice} />
          </div>

          {/* Agregar al carrito (ver montar-carrito-en-base-al-catalogo.md)
              — carrito de pedido sin precios, no e-commerce; el checkout
              real pasa por WhatsApp desde el drawer del carrito. Barra fija
              al pie del diálogo: SIEMPRE visible. La cantidad muestra la unidad elegida ("2 Cajas"). */}
          {!deliverable && !pickupable ? null : (
          <div className="flex shrink-0 items-center gap-3 border-t bg-white px-5 py-3 sm:px-6" style={{ borderColor: RULE }}>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label={tCart("decreaseAria", { name: title })}
                className="flex h-9 w-9 items-center justify-center rounded-full border outline-none transition hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#075FD8] focus-visible:ring-offset-2"
                style={{ borderColor: RULE, color: INK }}
              >
                <Minus className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
              </button>
              <span className="min-w-[64px] text-center leading-tight" aria-live="polite">
                <span className="block text-[15px] font-semibold tabular-nums" style={{ color: INK }}>
                  {quantity}
                </span>
                <span className="block min-h-[16px] text-[11.5px] font-medium leading-4" style={{ color: TEXT_SOFT }}>
                  {quantityUnit ? unitName(quantityUnit, quantity, locale) : " "}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(9999, q + 1))}
                aria-label={tCart("increaseAria", { name: title })}
                className="flex h-9 w-9 items-center justify-center rounded-full border outline-none transition hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#075FD8] focus-visible:ring-offset-2"
                style={{ borderColor: RULE, color: INK }}
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-2 sm:flex-row">
              {deliverable && (
                <button
                  type="button"
                  onClick={() => handleAddToCart("delivery")}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-corp-blue px-4 py-2.5 text-[14.5px] font-semibold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#075FD8] focus-visible:ring-offset-2"
                >
                  <ShoppingCart className="h-4 w-4" strokeWidth={2} aria-hidden />
                  {justAdded === "delivery" ? tCart("addedConfirmation") : pickupable ? tCart("addToDeliveryCta") : tCart("addToCartCta")}
                </button>
              )}
              {pickupable && (
                <button
                  type="button"
                  onClick={() => handleAddToCart("pickup")}
                  className={
                    deliverable
                      ? "flex flex-1 items-center justify-center gap-2 rounded-full border bg-white px-4 py-2.5 text-[14.5px] font-semibold outline-none transition hover:bg-[#FFF3CF] focus-visible:ring-2 focus-visible:ring-[#075FD8] focus-visible:ring-offset-2"
                      : "flex flex-1 items-center justify-center gap-2 rounded-full bg-corp-blue px-4 py-2.5 text-[14.5px] font-semibold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#075FD8] focus-visible:ring-offset-2"
                  }
                  style={deliverable ? { borderColor: "#EBCB6B", color: "#7A5300" } : undefined}
                >
                  <Store className="h-4 w-4" strokeWidth={2} aria-hidden />
                  {justAdded === "pickup" ? tCart("addedConfirmation") : tCart("addToPickupCta")}
                </button>
              )}
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
