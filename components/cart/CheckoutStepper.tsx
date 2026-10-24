"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { CHECKOUT_STEPS, type CheckoutStep } from "@/lib/order-types";
import { BEIGE, INK, RULE, TEXT_MUTED } from "@/components/ui/drawer-tokens";

// Indicador de pasos del pedido: carrito, entrega, pago y resumen. El paso actual lleva aria-current="step".
export default function CheckoutStepper({ current }: { current: CheckoutStep }) {
  const t = useTranslations("Cart.order");
  const currentIndex = CHECKOUT_STEPS.indexOf(current);
  const labels: Record<CheckoutStep, string> = {
    cart: t("stepCart"),
    delivery: t("stepDelivery"),
    payment: t("stepPayment"),
    summary: t("stepSummary"),
  };

  return (
    <nav aria-label={t("stepperAria")} className="shrink-0 border-b bg-white px-5 py-3" style={{ borderColor: RULE }}>
      <ol className="flex items-center justify-between gap-1">
        {CHECKOUT_STEPS.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          return (
            <li
              key={step}
              aria-current={active ? "step" : undefined}
              className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center"
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold motion-safe:transition-colors motion-safe:duration-150"
                style={{
                  background: active || done ? INK : BEIGE,
                  color: active || done ? "#fff" : TEXT_MUTED,
                }}
                aria-hidden
              >
                {done ? <Check className="h-3 w-3" strokeWidth={3} /> : index + 1}
              </span>
              <span
                className="w-full truncate text-[11px] font-semibold leading-none"
                style={{ color: active ? INK : TEXT_MUTED }}
              >
                {labels[step]}
                <span className="sr-only">{done ? ` (${t("stepDone")})` : active ? ` (${t("stepCurrent")})` : ""}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
