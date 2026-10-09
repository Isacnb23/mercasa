import type { CatalogUnit } from "@/lib/catalog-prices";
import { allEquivalences, approxBasePrice, formatAmount, shortEquivalence, unitLabel, unitName, unitTitle } from "@/lib/presentations";

// Zona de precio + presentación del modal de producto. Componente PURO (sin hooks ni traducciones propias):
// recibe textos y formateadores, así se puede probar renderizado en el servidor. DIMENSIONES ESTABLES: todo lo
// que antes aparecía o desaparecía al alternar presentaciones ("≈ ₡X por lata", "24 latas" de cada tarjeta,
// "Equivalencias") tiene su espacio siempre reservado (`data-slot` + alto mínimo), las tarjetas del selector
// miden lo mismo entre sí y las equivalencias son SIEMPRE todas las del producto (la elegida solo se resalta,
// sin cambiar medidas). Así el modal, la imagen, el selector y la barra de agregar no se mueven.

const INK = "#082B5C";
const MUTED = "#8493A5";
const TEXT_SOFT = "#5C6B7D";
const RULE = "#E2E8F0";
const SELECTED_BG = "#EAF0F8";

export interface PanelLabels {
  selector: string;
  equivalenceTitle: string;
  vat: string;
  pricePlusTax: (price: string) => string;
  perUnit: (unit: string) => string;
  approx: (price: string, unit: string) => string;
  equivalence: (big: string, amount: string, small: string) => string;
  soldBy: (unit: string) => string;
}

export interface PresentationPanelProps {
  // Presentaciones ordenadas de menor a mayor factor (sortUnits).
  units: ReadonlyArray<CatalogUnit>;
  selectedUnitId: string;
  onSelect: (unitId: string) => void;
  locale: string;
  formatPrice: (amount: number) => string;
  labels: PanelLabels;
}

const KEYS = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];

export default function PresentationPanel({ units, selectedUnitId, onSelect, locale, formatPrice, labels }: PresentationPanelProps) {
  const selected = units.find((u) => u.unitId === selectedUnitId) ?? units[0];
  if (!selected) return null;

  const approx = approxBasePrice(selected);
  const equivalenceList = allEquivalences(units);
  const single = units.length === 1;

  return (
    <div className="flex flex-col gap-5" data-slot="panel">
      {/* Precio: grande; "+ IVA" y "por Caja" más pequeños y en color suave. Las dos líneas de detalle
          conservan su alto aunque no apliquen (p. ej. "≈ por lata" cuando se elige la base). */}
      <div className="flex flex-col gap-1" data-slot="price">
        <span key={selected.unitId} className="pd-price-swap flex flex-wrap items-baseline gap-x-2" data-slot="price-main">
          <span className="text-[28px] font-bold leading-none tracking-tight tabular-nums" style={{ color: INK }}>
            {formatPrice(selected.unitPrice)}
          </span>
          <span className="text-[13px] font-medium" style={{ color: TEXT_SOFT }}>
            {labels.vat}
          </span>
        </span>
        <span className="block min-h-[20px] text-[13px] font-medium leading-5" style={{ color: TEXT_SOFT }} data-slot="per-unit">
          {labels.perUnit(unitLabel(selected.unitId, locale))}
        </span>
        <span
          className="block min-h-[20px] text-[13px] font-medium leading-5"
          style={{ color: TEXT_SOFT }}
          data-slot="approx"
          aria-hidden={approx ? undefined : true}
        >
          {approx ? labels.approx(formatPrice(approx.price), unitName(approx.unitId, 1, locale)) : " "}
        </span>
      </div>

      {!single && (
        <div data-slot="selector">
          <p className="text-[10.5px] font-bold uppercase" style={{ color: MUTED, letterSpacing: "0.12em" }} id="pd-unit-label">
            {labels.selector}
          </p>
          {/* Tarjetas compactas seleccionables, todas del mismo tamaño (filas de igual alto), de menor a mayor
              factor, para comparar sin hacer clic. Flechas del teclado cambian la opción. */}
          <div
            role="radiogroup"
            aria-labelledby="pd-unit-label"
            className="mt-2 grid gap-2"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(112px, 1fr))", gridAutoRows: "1fr" }}
            onKeyDown={(e) => {
              if (!KEYS.includes(e.key)) return;
              e.preventDefault();
              const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
              const index = units.findIndex((u) => u.unitId === selected.unitId);
              const next = units[(index + step + units.length) % units.length];
              onSelect(next.unitId);
              (e.currentTarget.querySelector(`[data-unit="${CSS.escape(next.unitId)}"]`) as HTMLElement | null)?.focus();
            }}
          >
            {units.map((u) => {
              const active = u.unitId === selected.unitId;
              const short = shortEquivalence(u);
              return (
                <button
                  key={u.unitId}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  data-slot="card"
                  data-unit={u.unitId}
                  tabIndex={active ? 0 : -1}
                  onClick={() => onSelect(u.unitId)}
                  className="flex min-h-[76px] flex-col items-start gap-0.5 rounded-2xl border px-3 py-2.5 text-left outline-none motion-safe:transition-colors motion-safe:duration-150 focus-visible:ring-2 focus-visible:ring-[#075FD8] focus-visible:ring-offset-2"
                  style={{
                    borderColor: active ? INK : RULE,
                    background: active ? SELECTED_BG : "#FFFFFF",
                    boxShadow: active ? `inset 0 0 0 1px ${INK}` : "none",
                  }}
                >
                  <span className="text-[14px] font-semibold leading-tight" style={{ color: INK }}>
                    {unitLabel(u.unitId, locale)}
                  </span>
                  <span className="text-[13px] font-bold leading-tight tabular-nums" style={{ color: INK }}>
                    {labels.pricePlusTax(formatPrice(u.unitPrice))}
                  </span>
                  <span className="min-h-[16px] text-[12px] font-medium leading-4" style={{ color: TEXT_SOFT }} data-slot="card-eq">
                    {short ? `${formatAmount(short.amount, locale)} ${unitName(short.unitId, short.amount, locale)}` : " "}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Equivalencias: SIEMPRE todas las del producto; la presentación elegida se resalta (mismo tamaño de
          línea: solo cambia el color de fondo y la marca lateral). Con una sola presentación, una línea fija. */}
      <div data-slot="equivalences">
        <p className="text-[10.5px] font-bold uppercase" style={{ color: MUTED, letterSpacing: "0.12em" }}>
          {labels.equivalenceTitle}
        </p>
        <ul className="mt-2 flex flex-col gap-1">
          {single ? (
            <li data-slot="eq-line" className="rounded-lg border-l-2 px-2.5 py-1 text-[14.5px] font-medium" style={{ color: INK, borderColor: "transparent" }}>
              {labels.soldBy(unitLabel(selected.unitId, locale))}
            </li>
          ) : (
            equivalenceList.map((eq) => {
              const involved = eq.bigUnitId === selected.unitId || eq.smallUnitId === selected.unitId;
              return (
                <li
                  key={`${eq.bigUnitId}>${eq.smallUnitId}`}
                  data-slot="eq-line"
                  aria-current={involved ? "true" : undefined}
                  className="rounded-lg border-l-2 px-2.5 py-1 text-[14.5px] font-medium motion-safe:transition-colors motion-safe:duration-150"
                  style={{
                    color: INK,
                    background: involved ? SELECTED_BG : "transparent",
                    borderColor: involved ? INK : "transparent",
                  }}
                >
                  {labels.equivalence(unitTitle(eq.bigUnitId, 1, locale), formatAmount(eq.amount, locale), unitTitle(eq.smallUnitId, eq.amount, locale))}
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
