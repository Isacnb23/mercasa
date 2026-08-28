import { getProductHierarchy } from "@/lib/mercasavip-catalog";
import ContactSection from "./ContactSection";

// Server Component async: mismo fetch cacheado 15 min que ya dispara
// ProductsExplorerLoader (ver ese archivo) — en la práctica, para cuando
// esto corre ya suele estar tibio en caché de proceso, así que rara vez
// pega un segundo hit real a MercasaVIP. Se usa para resolver los chips de
// "categorías que te interesan" en Customer Class (ver
// customer-class-chips-reales.md) contra la jerarquía real de Familia/
// Sub-familia. A diferencia de ProductsExplorerLoader, acá NO hay un
// estado de error visible: el resto de la sección (dirección, mapa,
// WhatsApp) no depende de esta data — si el fetch falla, los chips
// simplemente no abren nada al hacer click (degradación silenciosa, no
// vale la pena una UI de error para una feature secundaria de la sección).
export default async function ContactSectionLoader() {
  const result = await getProductHierarchy().catch(() => ({ ok: false as const, error: "" }));
  return <ContactSection families={result.ok ? result.data : []} />;
}
