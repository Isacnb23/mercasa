import { NextRequest, NextResponse } from "next/server";

// Endpoint real de imágenes de producto: en vez de conectarse directo a SQL
// Server (lib/arte.ts, que se deja intacta sin usar por si hace falta
// revertir rápido — sjodb01 no es resoluble desde la nube pública, ver
// mercasa-api/README.md), reenvía a `mercasa-api` (servicio hermano,
// desplegado por Steve dentro de la red de Mercasa con acceso real a
// sjodb01) — ver conectar-mercasa-web-api-local.md y
// probar-mercasa-api-produccion.md (verificado end-to-end contra
// https://api.mercasacr.com con datos reales de SQL + SharePoint).
//
// Mismo contrato externo que antes (misma URL, mismos query params, mismos
// status codes) — ProductImage.tsx no se entera del cambio, cualquier
// status no-200 del <img> ya cae al ícono de fallback por su cuenta.

// Mismo criterio de seguridad que la ruta original: los ItemId de
// MercasaVIP son alfanuméricos (+ guiones/puntos), cualquier otra cosa se
// rechaza antes de reenviarla a mercasa-api.
const SAFE_ITEM_ID = /^[A-Za-z0-9_.-]+$/;

function parseVariant(value: string | null): "s" | "m" | "l" {
  return value === "s" || value === "m" ? value : "l";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;

  if (!SAFE_ITEM_ID.test(itemId)) {
    return NextResponse.json({ error: "itemId inválido" }, { status: 400 });
  }

  const variant = parseVariant(request.nextUrl.searchParams.get("size"));

  const apiBase = process.env.MERCASA_API_BASE;
  const apiKey = process.env.MERCASA_API_KEY;

  if (!apiBase || !apiKey) {
    console.error(
      "[product-images] Falta configurar MERCASA_API_BASE/MERCASA_API_KEY en .env.local (ver conectar-mercasa-web-api-local.md)"
    );
    return NextResponse.json({ error: "No se pudo obtener la imagen" }, { status: 502 });
  }

  const upstreamUrl = `${apiBase}/api/product-images/${encodeURIComponent(itemId)}?size=${variant}`;
  console.log(`[product-images] Pidiendo a mercasa-api: itemId=${itemId} variant=${variant}`);

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { "X-Api-Key": apiKey },
      cache: "no-store",
      // mercasa-api corriendo local pero no respondiendo (colgada, red
      // interna caída) no debe trabar la página esperando para siempre —
      // mismo espíritu del punto 5 del doc: no romper la página.
      signal: AbortSignal.timeout(10_000),
    });

    if (upstream.status === 404) {
      console.log(`[product-images] mercasa-api devolvió 404 para itemId=${itemId} variant=${variant} (sin foto)`);
      return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
    }

    if (!upstream.ok || !upstream.body) {
      const errorBody = await upstream.text().catch(() => "");
      console.error(`[product-images] mercasa-api respondió ${upstream.status} para itemId=${itemId}: ${errorBody}`);
      return NextResponse.json({ error: "No se pudo obtener la imagen" }, { status: 502 });
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "image/png",
        // Contenido público de solo lectura y estable (fotos de catálogo):
        // cache agresivo en el navegador/CDN, con revalidación de fondo.
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    // mercasa-api apagada (ECONNREFUSED), timeout, DNS, etc. — se loguea el
    // error real acá, pero el cliente recibe el mismo 502 "genérico" de
    // siempre, que cae al mismo ícono de fallback que un producto sin foto.
    console.error("[product-images] No se pudo contactar a mercasa-api:", error);
    return NextResponse.json({ error: "No se pudo obtener la imagen" }, { status: 502 });
  }
}
