"use client";

import { useState } from "react";
import { Package, type LucideIcon } from "lucide-react";

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
}: {
  itemId: string;
  name: string;
  familyIcon?: LucideIcon;
  size?: "s" | "m" | "l";
  className?: string;
}) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  if (status === "error") {
    return (
      <span className={className} role="img" aria-label={name}>
        <FamilyIcon className="h-full w-full" strokeWidth={1.5} aria-hidden />
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
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
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
