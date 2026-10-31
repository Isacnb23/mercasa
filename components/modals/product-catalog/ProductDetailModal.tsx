"use client";

import { useEffect, useRef, useState } from "react";
import { ImageOff, X, type LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ProductSummary } from "@/lib/product-types";
import { useCart } from "@/lib/cart-context";
import ProductImage from "./ProductImage";
import PriceTag from "./PriceTag";
import PresentationPanel, { type PanelLabels } from "./PresentationPanel";
import type { PriceView } from "@/lib/catalog-prices";
import { formatColones } from "@/lib/checkout-format";
import { productTitle } from "@/lib/product-display";
import { pickInitialUnit, sortUnits, unitName } from "@/lib/presentations";
import { useCatalogUnits } from "@/lib/hooks/useCatalogUnits";
import { canAddToCart } from "@/lib/catalog-channel";
import { cartPickupSite, needsStoreChangeConfirmation, siteNameInCart } from "@/lib/cart-logic";
import {
  addTarget,
  channelOptions,
  maxQuantity,
  normalize,
  selectChannel,
  selectSite,
  selectUnit,
  storeStatusOf,
  type Notice,
  type Selection,
} from "@/lib/purchase";
import AddBar from "./AddBar";
import ChannelStep from "./ChannelStep";
import PickupStoreChooser from "./PickupStoreChooser";
import StoreChangeConfirm from "./StoreChangeConfirm";

// Feature simple (ver catalogo-detalle-producto.md): lightbox de un solo
// producto ENCIMA del catálogo (no reemplaza el flipbook, no navega a otra
// ruta) — se monta/desmonta por su cuenta desde ProductCatalogModal, sin
// tocar `currentPage` del libro, así cerrar vuelve exacto a la misma
// página. Fuera de alcance a propósito (ver el doc): sin prev/next entre
// productos, sin zoom interactivo, sin mostrar familia/sub-familia acá.
//
// La compra va en tres pasos con UNA fuente de verdad (lib/purchase.ts: presentación -> canal -> tienda): 1) presentación, 2) "¿Cómo lo
// querés?" (domicilio | retiro, según la presentación elegida), 3) la tienda (solo retiro) y, en la barra fija al pie, cantidad y un solo botón.

const INK = "#082B5C";
const MUTED = "#8493A5";
// Texto secundario legible (contraste AA sobre blanco); MUTED queda para etiquetas y detalles.
const TEXT_SOFT = "#5C6B7D";
const CHIP_BG = "#F4F6F9";

export default function ProductDetailModal({
  product,
  icon,
  price,
  onClose,
}: {
  product: ProductSummary;
  icon: LucideIcon;
  price: PriceView;
  onClose: () => void;
}) {
  const t = useTranslations("Products");
  const tCart = useTranslations("Cart");
  const locale = useLocale();
  const [imageStatus, setImageStatus] = useState<"loading" | "loaded" | "error">("loading");
  // Solo para MOSTRAR: el nombre original (product.name) es el que va al carrito y al servidor. El título es el
  // nombre comercial sin el sufijo de empaque ("24U/C 60C/T"), que sugiere presentaciones que pueden no existir.
  const { title, packagingText } = productTitle(product.name);

  const { addItem, items: cartItems, pickupSiteId, setPickupSite } = useCart();
  const deliverable = canAddToCart(product, "delivery");
  const pickupSites = product.availability?.pickup.sites ?? [];

  // Presentaciones vendibles (solo con sesión). El modal abre con la MISMA presentación que muestra la tarjeta
  // (la unidad del listado). Si esa unidad no estuviera entre las presentaciones, no se ofrece selector y se
  // conserva el precio de la tarjeta: nunca se abre con otra presentación.
  const { status: unitsStatus, unitsFor } = useCatalogUnits(deliverable ? [product.id] : []);
  const rawUnits = unitsFor(product.id);
  const listingUnit = price.kind === "price" ? price.unit : null;
  const initialUnit = pickInitialUnit(rawUnits, listingUnit);
  const units = rawUnits && (initialUnit || !listingUnit) ? sortUnits(rawUnits) : null;

  // ---- La selección: lo que eligió el cliente, normalizado contra lo que informa el servidor ----
  // UNA tienda de retiro por carrito: si el carrito ya tiene retiro con tienda elegida, el modal viene con esa tienda preseleccionada.
  const cartSite = cartPickupSite(cartItems, pickupSiteId);
  const [chosen, setChosen] = useState<Selection>({ unitId: null, channel: null, siteId: cartSite });
  // Tienda distinta a la del carrito pendiente de confirmar ("¿Cambiar todo el retiro a Y?").
  const [pendingSite, setPendingSite] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const { selection, notice: derivedNotice } = normalize(product, units, { ...chosen, unitId: chosen.unitId ?? initialUnit?.unitId ?? null });
  const selected = units?.find((u) => u.unitId === selection.unitId) ?? null;
  const options = channelOptions(product, selected);
  const quantityUnit = selected?.unitId ?? (price.kind === "price" ? price.unit : "");

  // Al pasar a retiro se propone la tienda del carrito (si tiene la presentación).
  const onSelectUnit = (unitId: string) => {
    const next = selectUnit(product, units, selection, unitId);
    setChosen(next.selection);
    setNotice(next.notice);
    setPendingSite(null);
  };
  const onSelectChannel = (channel: "delivery" | "pickup") => {
    setChosen(selectChannel(product, units, selection, channel, cartSite));
    setNotice(null);
    setPendingSite(null);
  };
  // Elegir una tienda distinta a la del carrito pide confirmación: cambiarla cambia TODO el retiro del carrito.
  const onSelectSite = (siteId: string) => {
    setNotice(null);
    if (needsStoreChangeConfirmation(cartSite, siteId)) {
      setPendingSite(siteId);
      return;
    }
    setPendingSite(null);
    setChosen(selectSite(product, units, selection, siteId));
  };
  // Aceptar: la tienda del grupo cambia (se borra la fecha de retiro y se revalida la existencia de todas las líneas en la nueva tienda).
  const acceptStoreChange = () => {
    if (!pendingSite) return;
    setPickupSite(pendingSite);
    setChosen(selectSite(product, units, selection, pendingSite));
    setPendingSite(null);
  };

  // La cantidad nunca pasa de lo que se puede saber que hay (sin mostrar el número); se recorta al cambiar la presentación o la tienda.
  const max = maxQuantity(product, units, selection);
  const shownQuantity = max >= 1 ? Math.min(quantity, max) : quantity;

  const target = addTarget(product, units, selection);
  const chosenSite = selection.siteId ? pickupSites.find((s) => s.siteId === selection.siteId) ?? null : null;
  const chooserStores = pickupSites.map((s) => ({ ...s, status: storeStatusOf(selected, s.siteId) }));

  // El sufijo de empaque del nombre solo se muestra (como dato informativo) cuando NO hay presentaciones reales
  // que lo reemplacen, y nunca como si fuera una presentación disponible.
  const showNamePackaging = !!packagingText && (!units || units.length <= 1);

  // Foco inicial en el botón de cerrar (Escape lo maneja ProductCatalogModal).
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  const handleAddToCart = () => {
    if (!target.ok || max < 1) return;
    if (target.channel === "pickup" && target.siteId) setPickupSite(target.siteId);
    addItem(product, shownQuantity, target.unitId, target.channel);
    setJustAdded(true);
    setQuantity(1);
    setTimeout(() => setJustAdded(false), 1800);
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

  const canBuy = options.length > 0;

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
          {/* Zonas con aire: título, presentación, "¿Cómo lo querés?" y tiendas. Scroll interno si no entra; la barra de cantidad/agregar
              queda fuera de esta zona y SIEMPRE visible. */}
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

            {/* Paso 1: presentación (precio con IVA incluido y equivalencia de cada una; con una sola, fija). */}
            {units && selected ? (
              <PresentationPanel
                units={units}
                selectedUnitId={selected.unitId}
                onSelect={onSelectUnit}
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

            {/* Paso 2: ¿Cómo lo querés? según la presentación elegida. */}
            {canBuy && <ChannelStep options={options} value={selection.channel} onChange={onSelectChannel} notice={notice ?? derivedNotice} />}

            {/* Paso 3 (retiro): lista única de tiendas con esa presentación. La cantidad y el botón van en la barra fija de abajo. */}
            {selection.channel === "pickup" && (
              <section className="flex flex-col gap-2.5" aria-labelledby="pd-stores-title">
                <h3 id="pd-stores-title" className="text-[10.5px] font-bold uppercase" style={{ color: MUTED, letterSpacing: "0.12em" }}>
                  {tCart("storesStepTitle")}
                </h3>
                {pendingSite && cartSite && (
                  <StoreChangeConfirm
                    current={siteNameInCart(cartItems, cartSite) ?? pickupSites.find((s) => s.siteId === cartSite)?.name ?? cartSite}
                    next={pickupSites.find((s) => s.siteId === pendingSite)?.name ?? pendingSite}
                    onAccept={acceptStoreChange}
                    onKeep={() => setPendingSite(null)}
                  />
                )}
                <PickupStoreChooser stores={chooserStores} chosenId={selection.siteId} onChoose={onSelectSite} labelledBy="pd-stores-title" />
              </section>
            )}
          </div>

          {/* Agregar al carrito (ver montar-carrito-en-base-al-catalogo.md) — carrito de pedido sin precios, no e-commerce; el checkout
              real pasa por WhatsApp desde el drawer del carrito. Barra fija al pie del diálogo: SIEMPRE visible. */}
          {canBuy && (
            <AddBar
              title={title}
              quantity={shownQuantity}
              max={max}
              unitText={quantityUnit ? unitName(quantityUnit, shownQuantity, locale) : ""}
              onQuantity={setQuantity}
              channel={selection.channel}
              siteName={chosenSite?.name ?? null}
              enabled={target.ok && max >= 1}
              needsStore={selection.channel === "pickup" && !target.ok && target.reason === "store"}
              justAdded={justAdded}
              onAdd={handleAddToCart}
            />
          )}
        </div>
      </div>
    </div>
  );
}
