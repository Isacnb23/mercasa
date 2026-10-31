"use client";

import { useTranslations } from "next-intl";

const INK = "#082B5C";
const TEXT_SOFT = "#5C6B7D";

interface Props {
  // Tienda del retiro del carrito y la que el cliente acaba de elegir en el modal.
  current: string;
  next: string;
  onAccept: () => void;
  onKeep: () => void;
}

// Confirmación (en el propio modal, sin diálogos del navegador) al elegir una tienda distinta a la del retiro del carrito: el retiro es de UNA
// sola tienda, así que cambiarla cambia todo el retiro (se revisa la existencia de todas sus líneas y se borra la fecha de retiro).
export default function StoreChangeConfirm({ current, next, onAccept, onKeep }: Props) {
  const t = useTranslations("Cart");
  return (
    <div role="alert" className="flex flex-col gap-2.5 rounded-2xl border px-3.5 py-3" style={{ borderColor: "#EBCB6B", background: "#FFF9E6" }}>
      <p className="text-[13.5px] font-semibold leading-snug" style={{ color: INK }}>
        {t("storeChangeConfirm", { current, next })}
      </p>
      <p className="text-[12.5px] leading-snug" style={{ color: TEXT_SOFT }}>
        {t("storeChangeNote")}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAccept}
          className="min-h-[40px] rounded-full bg-corp-blue px-4 py-2 text-[13.5px] font-semibold leading-tight text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#075FD8] focus-visible:ring-offset-2"
        >
          {t("storeChangeAccept")}
        </button>
        <button
          type="button"
          onClick={onKeep}
          className="min-h-[40px] rounded-full border bg-white px-4 py-2 text-[13.5px] font-semibold leading-tight outline-none transition hover:bg-[#FBF9F5] focus-visible:ring-2 focus-visible:ring-[#075FD8] focus-visible:ring-offset-2"
          style={{ borderColor: "#E2E8F0", color: INK }}
        >
          {t("storeChangeKeep", { current })}
        </button>
      </div>
    </div>
  );
}
