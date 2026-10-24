"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { BEIGE, TEXT_MUTED } from "@/components/ui/drawer-tokens";
import DeliveryDates from "./DeliveryDates";

interface Props {
  // Fecha elegida ("yyyy-MM-dd") para la dirección activa, o null.
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

// Bloque de entrega del carrito cuando NO está el flujo de 4 pasos (pedido apagado o sin sesión/dirección):
// con sesión, las fechas de la dirección activa (la elegida viaja en la cotización por WhatsApp); sin sesión,
// el aviso para iniciar sesión. El pedido mínimo y los totales los muestra OrderSummary con los datos del
// servidor (el carrito no calcula nada).
export default function CartCheckoutInfo({ selectedDate, onSelectDate }: Props) {
  const t = useTranslations("Cart.checkout");
  const { user } = useAuth();

  if (!user) {
    return (
      <p
        className="mt-5 rounded-2xl px-4 py-3.5 text-[13px] leading-relaxed"
        style={{ background: BEIGE, color: TEXT_MUTED }}
      >
        {t("loginHint")}
      </p>
    );
  }

  return (
    <section className="mt-6" aria-label={t("sectionAria")}>
      <DeliveryDates selectedDate={selectedDate} onSelectDate={onSelectDate} />
    </section>
  );
}
