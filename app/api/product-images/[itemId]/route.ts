import { NextRequest, NextResponse } from "next/server";
import { getProductImage, type ImageVariant } from "@/lib/arte";

// Endpoint real de imágenes de producto: ITEMID -> tabla Arte (SQL Server,
// resuelve Nombre_Archivo) -> Microsoft Graph (contenido del archivo en
// SharePoint). Reemplaza al proxy de HomeX en app/api/images/[itemId].

// Mismo criterio de seguridad que el proxy de HomeX que reemplaza: los
// ItemId de MercasaVIP son alfanuméricos (+ guiones/puntos), cualquier otra
// cosa se rechaza antes de usarla en la consulta a Arte.
const SAFE_ITEM_ID = /^[A-Za-z0-9_.-]+$/;

function parseVariant(value: string | null): ImageVariant {
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

  // DEBUG TEMPORAL — ver diagnostico-product-images-404.md — quitar una vez
  // identificada la causa real del 404 total.
  console.log("[product-images] ENV check:", {
    hasDbUser: !!process.env.ARTE_DB_USER,
    hasDbPassword: !!process.env.ARTE_DB_PASSWORD,
    hasDbServer: !!process.env.ARTE_DB_SERVER,
    hasDbDatabase: !!process.env.ARTE_DB_DATABASE,
    hasTenantId: !!process.env.SHAREPOINT_TENANT_ID,
    hasClientId: !!process.env.SHAREPOINT_CLIENT_ID,
    hasClientSecret: !!process.env.SHAREPOINT_CLIENT_SECRET,
  });
  console.log(`[product-images] Pedido: itemId=${itemId} variant=${variant}`);

  try {
    const image = await getProductImage(itemId, variant);

    if (!image) {
      console.log(`[product-images] getProductImage devolvió null para itemId=${itemId} variant=${variant} -> 404`);
      return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
    }

    return new NextResponse(image.body, {
      status: 200,
      headers: {
        "Content-Type": image.contentType,
        // Contenido público de solo lectura y estable (fotos de catálogo):
        // cache agresivo en el navegador/CDN, con revalidación de fondo.
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    console.error("[/api/product-images]", error);
    return NextResponse.json({ error: "No se pudo obtener la imagen" }, { status: 502 });
  }
}
