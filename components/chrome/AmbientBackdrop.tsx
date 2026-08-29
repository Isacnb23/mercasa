import ChapterCurves from "./ChapterCurves";

/**
 * Lienzo compartido: un único fondo fijo (negro/navy con resplandores muy
 * sutiles + líneas curvas de luz) detrás de TODAS las secciones. Las
 * secciones ya no declaran su propio bg-navy-* ni sus propias curvas, así
 * que no hay "bloques" ni texturas distintas entre ellas: todo el scroll
 * (Inicio, Nosotros, Logística, Productos, Contacto, Footer) ocurre sobre la
 * misma superficie con un solo sistema de fondo.
 */
export default function AmbientBackdrop() {
  return (
    <div className="fixed inset-0 -z-50 bg-ink bg-noise" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(52% 42% at 16% 6%, rgba(43,81,201,0.09), transparent 62%)," +
            "radial-gradient(48% 38% at 92% 14%, rgba(59,123,255,0.06), transparent 62%)," +
            "radial-gradient(46% 42% at 82% 96%, rgba(219,165,58,0.045), transparent 62%)," +
            "radial-gradient(42% 38% at 4% 88%, rgba(43,81,201,0.06), transparent 62%)",
        }}
      />
      <ChapterCurves variant={0} className="absolute inset-0 h-full w-full opacity-70" />
      <ChapterCurves variant={2} className="absolute inset-0 h-full w-full opacity-45" />
    </div>
  );
}
