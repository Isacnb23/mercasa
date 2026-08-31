"use client";

import { useState } from "react";
import { Package, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Foto real de producto vía /api/product-images/[itemId] (ver route.ts —
// resuelve el ITEMID contra la tabla Arte real de Mercasa y trae el archivo
// desde SharePoint). Cobertura ~85% (ver memoria de proyecto "Arte table
// findings"), así que el fallback a ícono de familia (onError) es un camino
// esperado para una porción real de los productos, no un caso raro.
//
// A diferencia del viejo proxy de HomeX, este backend no es instantáneo (es
// un proxy real a SharePoint, ~0.5-3s sin caché) — mientras "loading", se
// muestra un skeleton pulsante en vez de dejar la caja en blanco. El <img>
// vive en el DOM desde el primer render (con su src real) para que el
// navegador arranque a bajarlo ya mismo; solo se oculta visualmente hasta
// que carga.
export default function ProductImage({
  itemId,
  name,
  familyIcon: FamilyIcon = Package,
  size = "m",
  className,
  errorIconClassName,
  onStatusChange,
}: {
  itemId: string;
  name: string;
  familyIcon?: LucideIcon;
  size?: "s" | "m" | "l";
  className?: string;
  /** Tamaño del ícono de fallback cuando NO hay foto real (ver
   * catalogo-detalle-producto.md) — por defecto llena el 100% de
   * `className` (miniaturas chicas del flipbook, donde eso se ve bien),
   * pero el detalle ampliado de producto usa una caja mucho más grande y
   * necesita un ícono moderado ahí adentro, no gigante/pixelado. */
  errorIconClassName?: string;
  /** Notifica al padre el estado real de la carga (ver
   * catalogo-detalle-producto.md) — el detalle ampliado lo usa para
   * mostrar un texto "Foto no disponible" además del ícono cuando falla. */
  onStatusChange?: (status: "loading" | "loaded" | "error") => void;
}) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const updateStatus = (next: "loading" | "loaded" | "error") => {
    setStatus(next);
    onStatusChange?.(next);
  };

  if (status === "error") {
    return (
      <span className={cn("flex items-center justify-center", className)} role="img" aria-label={name}>
        <FamilyIcon className={errorIconClassName ?? "h-full w-full"} strokeWidth={1.5} aria-hidden />
      </span>
    );
  }

  return (
    <span className="relative block h-full w-full">
      {status === "loading" && (
        <span
          className="absolute inset-0 animate-pulse"
          style={{ background: "rgba(8, 43, 92, 0.08)" }}
          aria-hidden
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/product-images/${encodeURIComponent(itemId)}?size=${size}`}
        alt={name}
        onLoad={() => updateStatus("loaded")}
        onError={() => updateStatus("error")}
        className={className}
        style={{
          position: "absolute",
          inset: 0,
          opacity: status === "loaded" ? 1 : 0,
          transition: "opacity 200ms ease",
        }}
      />
    </span>
  );
}
