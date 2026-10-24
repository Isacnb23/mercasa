"use client";

import { useId } from "react";
import { Check, Landmark, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PaymentMethod } from "@/lib/order-types";
import { BEIGE, INK, RULE, TEXT_MUTED } from "@/components/ui/drawer-tokens";

interface Props {
  value: PaymentMethod | null;
  onChange: (method: PaymentMethod) => void;
}

// Paso 3: SINPE Móvil o transferencia (sin tarjeta). Las instrucciones salen de los mensajes
// (Cart.order.sinpeInstructions / transferInstructions), que se llenan con los datos reales; mientras estén
// vacíos se muestra "Te enviaremos los datos de pago al confirmar tu pedido". NO hay datos de pago inventados.
export default function PaymentStep({ value, onChange }: Props) {
  const t = useTranslations("Cart.order");
  const groupId = useId();

  const options: { method: PaymentMethod; label: string; hint: string; instructions: string; Icon: typeof Smartphone }[] = [
    { method: "sinpe", label: t("paymentSinpe"), hint: t("paymentSinpeHint"), instructions: (t.raw("sinpeInstructions") as string).trim(), Icon: Smartphone },
    { method: "transfer", label: t("paymentTransfer"), hint: t("paymentTransferHint"), instructions: (t.raw("transferInstructions") as string).trim(), Icon: Landmark },
  ];
  const selected = options.find((o) => o.method === value);

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="mb-3 font-display text-[15px] font-semibold" style={{ color: INK }}>
          {t("paymentTitle")}
        </legend>
        <div className="flex flex-col gap-2.5">
          {options.map(({ method, label, hint, Icon }) => (
            <label key={method} className="relative block cursor-pointer">
              <input
                type="radio"
                name={`${groupId}-payment`}
                value={method}
                checked={value === method}
                onChange={() => onChange(method)}
                className="peer sr-only"
              />
              <span
                className="flex min-h-[64px] items-center gap-3 rounded-2xl border bg-white px-4 py-3 motion-safe:transition motion-safe:duration-150 hover:border-[#B9C6D8] hover:bg-[#FBF9F5] peer-checked:border-[#082B5C] peer-checked:bg-[#EAF0F8] peer-checked:shadow-[inset_0_0_0_1px_#082B5C] peer-focus-visible:ring-2 peer-focus-visible:ring-[#075FD8] peer-focus-visible:ring-offset-2"
                style={{ borderColor: RULE, color: INK }}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: BEIGE }} aria-hidden>
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-semibold leading-snug">{label}</span>
                  <span className="block text-[12.5px] leading-snug" style={{ color: TEXT_MUTED }}>
                    {hint}
                  </span>
                </span>
              </span>
              <span
                aria-hidden
                className="pointer-events-none absolute right-3 top-3 hidden h-5 w-5 items-center justify-center rounded-full text-white peer-checked:flex"
                style={{ background: INK }}
              >
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <p className="text-[12.5px] leading-snug" style={{ color: TEXT_MUTED }}>
        {t("noCards")}
      </p>

      {selected && (
        <div className="rounded-2xl px-4 py-3.5" style={{ background: BEIGE }} aria-live="polite">
          <p className="whitespace-pre-line text-[13.5px] leading-relaxed" style={{ color: INK }}>
            {selected.instructions || t("paymentFallback")}
          </p>
        </div>
      )}
    </div>
  );
}
