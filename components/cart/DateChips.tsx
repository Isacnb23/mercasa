"use client";

import { useId } from "react";
import { Check } from "lucide-react";
import { useLocale } from "next-intl";
import { formatDeliveryChip, formatDeliveryDate } from "@/lib/checkout-format";
import { ACCENT, INK, RULE, TEXT_MUTED } from "@/components/ui/drawer-tokens";

interface Props {
  // Fechas de calendario "yyyy-MM-dd" a ofrecer.
  dates: string[];
  // Fecha elegida o null.
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  // id del título que nombra el grupo de radios.
  labelledBy: string;
  hint: string;
  // Texto corto bajo cada fecha (p. ej. "Sin costo de envío"), por fecha "yyyy-MM-dd". Sin entrada = sin texto.
  captions?: Record<string, string>;
}

// Chips de fecha como un grupo de radios accesible. Lo comparten las fechas de entrega a domicilio y las de retiro en tienda: mismo
// aspecto y mismo formato (America/Costa_Rica, sin correr el día).
export default function DateChips({ dates, selectedDate, onSelectDate, labelledBy, hint, captions }: Props) {
  const locale = useLocale();
  const groupId = useId();

  return (
    <fieldset className="m-0 min-w-0 border-0 p-0" aria-labelledby={labelledBy}>
      <div className="grid grid-cols-3 gap-2">
        {dates.map((iso) => {
          const chip = formatDeliveryChip(iso, locale);
          const full = formatDeliveryDate(iso, locale);
          if (!chip || !full) return null;
          const caption = captions?.[iso];
          return (
            <label key={iso} className="relative block cursor-pointer">
              <input
                type="radio"
                name={`${groupId}-date`}
                value={iso}
                checked={selectedDate === iso}
                onChange={() => onSelectDate(iso)}
                aria-label={caption ? `${full}. ${caption}` : full}
                className="peer sr-only"
              />
              <span
                className="flex min-h-[88px] flex-col items-center justify-center rounded-2xl border bg-white px-1 py-3 text-center motion-safe:transition motion-safe:duration-150 hover:border-[#B9C6D8] hover:bg-[#FBF9F5] peer-checked:border-[#082B5C] peer-checked:bg-[#EAF0F8] peer-checked:shadow-[inset_0_0_0_1px_#082B5C] peer-focus-visible:ring-2 peer-focus-visible:ring-[#075FD8] peer-focus-visible:ring-offset-2"
                style={{ borderColor: RULE, color: INK }}
                aria-hidden
              >
                <span className="text-[11px] font-bold uppercase leading-none" style={{ letterSpacing: "0.1em", color: TEXT_MUTED }}>
                  {chip.weekday}
                </span>
                <span className="mt-1.5 font-display text-[26px] font-semibold leading-none">{chip.day}</span>
                <span className="mt-1.5 text-[11px] font-bold uppercase leading-none" style={{ letterSpacing: "0.1em" }}>
                  {chip.month}
                </span>
                {caption && (
                  <span className="mt-1.5 px-0.5 text-[10.5px] font-semibold leading-tight" style={{ color: ACCENT }}>
                    {caption}
                  </span>
                )}
              </span>
              <span
                aria-hidden
                className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 w-5 items-center justify-center rounded-full text-white peer-checked:flex"
                style={{ background: INK }}
              >
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
            </label>
          );
        })}
      </div>
      <p className="mt-3 text-[12.5px] leading-relaxed" style={{ color: TEXT_MUTED }}>
        {hint}
      </p>
    </fieldset>
  );
}
