import { getTranslations } from "next-intl/server";
import { MessageCircle } from "lucide-react";
import { getProductHierarchy } from "@/lib/mercasavip-catalog";
import { site } from "@/lib/data";
import ProductExplorer from "./ProductExplorer";

// Server Component async: hace el fetch (cacheado 15 min, ver
// lib/mercasavip-catalog.ts) y decide qué mostrar. Vive detrás de un
// <Suspense> en ProductsSection para no bloquear el resto de la sección
// mientras responde MercasaVIP. Si la API falla o el árbol viene vacío,
// degrada con un mensaje en vez de romper la página.
export default async function ProductsExplorerLoader() {
  const t = await getTranslations("Products");

  const result = await getProductHierarchy().catch((err) => ({
    ok: false as const,
    error: err instanceof Error ? err.message : "Error desconocido",
  }));

  if (!result.ok || result.data.length === 0) {
    return (
      <div className="mt-16 flex flex-col items-center rounded-[28px] border bg-white px-6 py-14 text-center lg:mt-20" style={{ borderColor: "#E2E8F0" }}>
        <h3 className="font-display text-corp-ink" style={{ fontSize: "20px", fontWeight: 600 }}>
          {t("errorTitle")}
        </h3>
        <p className="mx-auto mt-2 max-w-[420px] text-[16px] leading-[1.6]" style={{ color: "#3A4A5F" }}>
          {t("errorDescription")}
        </p>
        <a
          href={site.whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-corp-blue px-5 py-2.5 text-[15.5px] font-semibold text-white transition hover:opacity-90"
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          {t("errorCta")}
        </a>
      </div>
    );
  }

  return <ProductExplorer families={result.data} />;
}
