"use client";

import { useCallback, useEffect, useRef, useState, type Ref } from "react";
import { AlertCircle, ArrowLeft, Store, Truck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  BEIGE,
  DANGER_BG,
  DANGER_TEXT,
  FOCUS_RING,
  INK,
  PRIMARY_BUTTON,
  RULE,
  SECONDARY_BUTTON,
  TEXT_MUTED,
} from "@/components/ui/drawer-tokens";
import { formatColones, formatDeliveryDate } from "@/lib/checkout-format";
import {
  DEFAULT_PAGE_SIZE,
  classifyOrdersError,
  formatOrderDateTime,
  parseOrderDetail,
  parseOrderList,
  type OrderDetail,
  type OrderList,
  type OrderStatus,
  type OrderSummary,
  type OrdersErrorKind,
} from "@/lib/orders";

export type Phase = "loading" | "ready" | "error";

interface Fetched<T> {
  data: T | null;
  error: OrdersErrorKind | null;
}

// GET a las rutas de "Mis pedidos". Nunca lleva cuenta: la sesión (cookie httpOnly) la pone el servidor.
async function getJson<T>(url: string, parse: (raw: unknown) => T | null): Promise<Fetched<T>> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    const body = await res.json().catch(() => null);
    if (!res.ok) return { data: null, error: classifyOrdersError(res.status, body) };
    const data = parse(body);
    return data === null ? { data: null, error: "unavailable" } : { data, error: null };
  } catch {
    return { data: null, error: "unavailable" };
  }
}

// Colores por grupo; el estado SIEMPRE lleva su texto (no depende solo del color).
const STATUS_STYLE: Record<OrderStatus, { background: string; color: string }> = {
  received: { background: "#EAF0F8", color: "#082B5C" },
  processing: { background: "#EAF0F8", color: "#082B5C" },
  on_route: { background: "#EAF0F8", color: "#082B5C" },
  approved: { background: "#E6F4EA", color: "#1B6B3A" },
  invoiced: { background: "#E6F4EA", color: "#1B6B3A" },
  delivered: { background: "#E6F4EA", color: "#1B6B3A" },
  postponed: { background: "#FFF4D6", color: "#7A5A00" },
  later: { background: "#FFF4D6", color: "#7A5A00" },
  partial: { background: "#FFF4D6", color: "#7A5A00" },
  cancelled: { background: DANGER_BG, color: DANGER_TEXT },
  returned: { background: DANGER_BG, color: DANGER_TEXT },
};

const orderKey = (order: OrderSummary) => `${order.channel}-${order.orderId}`;

// "Mis pedidos" dentro del panel de cuenta (patrón del registro: cambia el contenido del panel). Solo lectura.
export default function OrdersPanel({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<OrderSummary[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [phase, setPhase] = useState<Phase>("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const [selected, setSelected] = useState<OrderSummary | null>(null);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const lastOpened = useRef<string | null>(null);

  const requestPage = useCallback(
    (next: number) => getJson(`/api/customer/orders?page=${next}&pageSize=${DEFAULT_PAGE_SIZE}`, parseOrderList),
    [],
  );

  // Aplica el resultado de una página (siempre desde un callback de la petición, nunca de forma síncrona en un efecto).
  const applyPage = useCallback((result: Fetched<OrderList>, append: boolean) => {
    const { data } = result;
    if (data === null) {
      if (append) setMoreFailed(true);
      else setPhase("error");
      setLoadingMore(false);
      return;
    }
    setItems((current) =>
      append ? [...current, ...data.items.filter((i) => !current.some((c) => orderKey(c) === orderKey(i)))] : data.items,
    );
    setPage(data.page);
    setHasMore(data.hasMore);
    setPhase("ready");
    setLoadingMore(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    requestPage(1).then((result) => {
      if (!cancelled) applyPage(result, false);
    });
    return () => {
      cancelled = true;
    };
  }, [requestPage, applyPage]);

  // Al entrar, el foco va al título (teclado y lectores de pantalla).
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // Al volver del detalle, el foco regresa al pedido que se había abierto.
  useEffect(() => {
    if (selected !== null || lastOpened.current === null) return;
    const target = listRef.current?.querySelector<HTMLElement>(`[data-order-key="${CSS.escape(lastOpened.current)}"]`);
    target?.focus();
  }, [selected]);

  if (selected) {
    return <OrderDetailView summary={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <OrdersListView
      phase={phase}
      items={items}
      hasMore={hasMore}
      loadingMore={loadingMore}
      moreFailed={moreFailed}
      headingRef={headingRef}
      listRef={listRef}
      onBack={onBack}
      onRetry={() => {
        setPhase("loading");
        void requestPage(1).then((result) => applyPage(result, false));
      }}
      onMore={() => {
        setLoadingMore(true);
        setMoreFailed(false);
        void requestPage(page + 1).then((result) => applyPage(result, true));
      }}
      onOpen={(order) => {
        lastOpened.current = orderKey(order);
        setSelected(order);
      }}
    />
  );
}

// Lista: presentacional (la prueba renderiza cada estado: carga, error, vacío, lista, paginación).
export function OrdersListView({
  phase,
  items,
  hasMore,
  loadingMore = false,
  moreFailed = false,
  headingRef,
  listRef,
  onBack,
  onRetry,
  onMore,
  onOpen,
}: {
  phase: Phase;
  items: OrderSummary[];
  hasMore: boolean;
  loadingMore?: boolean;
  moreFailed?: boolean;
  headingRef?: Ref<HTMLHeadingElement>;
  listRef?: Ref<HTMLUListElement>;
  onBack: () => void;
  onRetry: () => void;
  onMore: () => void;
  onOpen: (order: OrderSummary) => void;
}) {
  const t = useTranslations("Orders");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onBack}
          className={`-ml-1 flex w-fit items-center gap-1.5 rounded-full px-2 py-1.5 text-[13.5px] font-semibold ${FOCUS_RING}`}
          style={{ color: INK }}
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.2} aria-hidden />
          {t("back")}
        </button>
        <h3
          ref={headingRef}
          tabIndex={-1}
          className="font-display outline-none"
          style={{ color: INK, fontSize: 26, lineHeight: 1.15, fontWeight: 650 }}
        >
          {t("title")}
        </h3>
      </div>

      {phase === "loading" && (
        <div role="status" aria-live="polite">
          <span className="sr-only">{t("loading")}</span>
          <div className="flex flex-col gap-3" aria-hidden>
            {[0, 1, 2].map((n) => (
              <div key={n} className="flex flex-col gap-2.5 rounded-2xl border bg-white p-4" style={{ borderColor: RULE }}>
                <span className="h-3.5 w-2/5 rounded-full motion-safe:animate-pulse" style={{ background: BEIGE }} />
                <span className="h-3 w-3/5 rounded-full motion-safe:animate-pulse" style={{ background: BEIGE }} />
                <span className="h-4 w-1/3 rounded-full motion-safe:animate-pulse" style={{ background: BEIGE }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === "error" && (
        <div className="flex flex-col gap-3">
          <ErrorNote>{t("loadError")}</ErrorNote>
          <button type="button" onClick={onRetry} className={SECONDARY_BUTTON} style={{ borderColor: RULE, color: INK }}>
            {t("retry")}
          </button>
        </div>
      )}

      {phase === "ready" && items.length === 0 && (
        <div className="rounded-2xl border bg-white px-5 py-8 text-center" style={{ borderColor: RULE }}>
          <p className="font-display text-[17px] font-semibold" style={{ color: INK }}>
            {t("emptyTitle")}
          </p>
          <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: TEXT_MUTED }}>
            {t("emptyBody")}
          </p>
        </div>
      )}

      {phase === "ready" && items.length > 0 && (
        <>
          <ul ref={listRef} aria-label={t("listAria")} className="flex flex-col gap-3">
            {items.map((order) => (
              <li key={orderKey(order)}>
                <OrderCard order={order} onOpen={() => onOpen(order)} />
              </li>
            ))}
          </ul>

          {moreFailed && <ErrorNote>{t("loadError")}</ErrorNote>}

          {hasMore && (
            <button
              type="button"
              onClick={onMore}
              disabled={loadingMore}
              className={SECONDARY_BUTTON}
              style={{ borderColor: RULE, color: INK }}
            >
              {loadingMore ? t("loadingMore") : moreFailed ? t("retry") : t("more")}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function OrderCard({ order, onOpen }: { order: OrderSummary; onOpen: () => void }) {
  const t = useTranslations("Orders");
  const locale = useLocale();
  const created = formatOrderDateTime(order.createdAt, locale);

  return (
    <button
      type="button"
      onClick={onOpen}
      data-order-key={orderKey(order)}
      className={`flex w-full flex-col gap-2 rounded-2xl border bg-white p-4 text-left motion-safe:transition motion-safe:duration-150 hover:bg-[#F7F4EE] ${FOCUS_RING}`}
      style={{ borderColor: RULE }}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="font-display text-[16px] font-semibold" style={{ color: INK }}>
          {t("orderNumber", { id: order.orderId })}
        </span>
        <StatusBadge status={order.status} />
      </span>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]" style={{ color: TEXT_MUTED }}>
        {created && <span>{created}</span>}
        <ChannelLabel channel={order.channel} />
      </span>
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-[12.5px]" style={{ color: TEXT_MUTED }}>
          {t("total")}
        </span>
        <span className="text-[15px] font-semibold" style={{ color: INK }}>
          {formatColones(order.total, locale, 2)}
        </span>
      </span>
    </button>
  );
}

function ChannelLabel({ channel }: { channel: OrderSummary["channel"] }) {
  const t = useTranslations("Orders");
  const Icon = channel === "pickup" ? Store : Truck;
  return (
    <span className="flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
      {channel === "pickup" ? t("channel.pickup") : t("channel.delivery")}
    </span>
  );
}

// Un solo lugar con los 11 textos (para cambiarlos fácil con Herson).
function useStatusLabel() {
  const t = useTranslations("Orders");
  return (status: OrderStatus): string => {
    switch (status) {
      case "received":
        return t("status.received");
      case "processing":
        return t("status.processing");
      case "postponed":
        return t("status.postponed");
      case "cancelled":
        return t("status.cancelled");
      case "approved":
        return t("status.approved");
      case "invoiced":
        return t("status.invoiced");
      case "on_route":
        return t("status.on_route");
      case "delivered":
        return t("status.delivered");
      case "partial":
        return t("status.partial");
      case "returned":
        return t("status.returned");
      case "later":
        return t("status.later");
    }
  };
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const label = useStatusLabel()(status);
  return (
    <span className="shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-bold" style={STATUS_STYLE[status]}>
      {label}
    </span>
  );
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl px-3.5 py-3 text-[13.5px] font-medium leading-snug"
      style={{ background: DANGER_BG, color: DANGER_TEXT }}
    >
      <AlertCircle className="mt-px h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
      {children}
    </p>
  );
}

// Detalle de un pedido (contenedor): pide el detalle y lo pasa a la vista.
function OrderDetailView({ summary, onBack }: { summary: OrderSummary; onBack: () => void }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [errorKind, setErrorKind] = useState<OrdersErrorKind>("unavailable");
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const requestDetail = useCallback(
    () => getJson(`/api/customer/orders/${encodeURIComponent(summary.orderId)}?channel=${summary.channel}`, parseOrderDetail),
    [summary.orderId, summary.channel],
  );

  const applyDetail = useCallback((result: Fetched<OrderDetail>) => {
    if (result.data === null) {
      setErrorKind(result.error ?? "unavailable");
      setPhase("error");
      return;
    }
    setDetail(result.data);
    setPhase("ready");
  }, []);

  useEffect(() => {
    let cancelled = false;
    requestDetail().then((result) => {
      if (!cancelled) applyDetail(result);
    });
    return () => {
      cancelled = true;
    };
  }, [requestDetail, applyDetail]);

  // Al abrir el detalle, el foco va al título.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <OrderDetailBody
      summary={summary}
      phase={phase}
      errorKind={errorKind}
      detail={detail}
      headingRef={headingRef}
      onBack={onBack}
      onRetry={() => {
        setPhase("loading");
        void requestDetail().then(applyDetail);
      }}
    />
  );
}

// Detalle: presentacional. Líneas, datos de entrega y línea de tiempo. Solo lectura.
export function OrderDetailBody({
  summary,
  phase,
  errorKind = "unavailable",
  detail,
  headingRef,
  onBack,
  onRetry,
}: {
  summary: OrderSummary;
  phase: Phase;
  errorKind?: OrdersErrorKind;
  detail: OrderDetail | null;
  headingRef?: Ref<HTMLHeadingElement>;
  onBack: () => void;
  onRetry: () => void;
}) {
  const t = useTranslations("Orders");
  const locale = useLocale();
  const statusLabel = useStatusLabel();

  // Mientras carga se muestra lo que ya se sabe de la lista.
  const order = detail?.order ?? summary;
  const created = formatOrderDateTime(order.createdAt, locale);
  const delivery = order.deliveryDate ? formatDeliveryDate(order.deliveryDate.slice(0, 10), locale) : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onBack}
          className={`-ml-1 flex w-fit items-center gap-1.5 rounded-full px-2 py-1.5 text-[13.5px] font-semibold ${FOCUS_RING}`}
          style={{ color: INK }}
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.2} aria-hidden />
          {t("backToList")}
        </button>
        <div className="flex items-start justify-between gap-3">
          <h3
            ref={headingRef}
            tabIndex={-1}
            className="font-display outline-none"
            style={{ color: INK, fontSize: 24, lineHeight: 1.15, fontWeight: 650 }}
          >
            {t("orderNumber", { id: order.orderId })}
          </h3>
          <StatusBadge status={order.status} />
        </div>
      </div>

      <dl className="flex flex-col gap-2.5 rounded-2xl border bg-white p-4 text-[13.5px]" style={{ borderColor: RULE }}>
        {created && <InfoRow label={t("createdOn")} value={created} />}
        <InfoRow label={t("channelLabel")} value={<ChannelLabel channel={order.channel} />} />
        {delivery && <InfoRow label={t("deliveryDate")} value={delivery} />}
        {order.addressName && (
          <InfoRow label={order.channel === "pickup" ? t("pickupStore") : t("deliveryAddress")} value={order.addressName} />
        )}
        <InfoRow label={t("total")} value={<strong style={{ color: INK }}>{formatColones(order.total, locale, 2)}</strong>} />
      </dl>

      {phase === "loading" && (
        <div role="status" aria-live="polite">
          <span className="sr-only">{t("loadingDetail")}</span>
          <div className="flex flex-col gap-2.5" aria-hidden>
            {[0, 1].map((n) => (
              <span key={n} className="h-12 rounded-xl motion-safe:animate-pulse" style={{ background: BEIGE }} />
            ))}
          </div>
        </div>
      )}

      {phase === "error" && (
        <div className="flex flex-col gap-3">
          <ErrorNote>{errorKind === "notFound" ? t("notFound") : t("detailError")}</ErrorNote>
          {errorKind !== "notFound" && (
            <button type="button" onClick={onRetry} className={PRIMARY_BUTTON} style={{ background: INK }}>
              {t("retry")}
            </button>
          )}
        </div>
      )}

      {phase === "ready" && detail && (
        <>
          <section aria-labelledby="orders-lines-title" className="flex flex-col gap-3">
            <h4 id="orders-lines-title" className="text-[12px] font-bold uppercase" style={{ color: TEXT_MUTED, letterSpacing: "0.1em" }}>
              {t("linesTitle")}
            </h4>
            {detail.lines.length === 0 ? (
              <p className="rounded-2xl border bg-white px-4 py-3.5 text-[13.5px] leading-relaxed" style={{ borderColor: RULE, color: TEXT_MUTED }}>
                {t("noLines")}
              </p>
            ) : (
              <ul className="flex flex-col divide-y rounded-2xl border bg-white" style={{ borderColor: RULE }}>
                {detail.lines.map((line, index) => (
                  <li key={`${line.itemId}-${index}`} className="flex items-start justify-between gap-3 px-4 py-3" style={{ borderColor: RULE }}>
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-semibold leading-snug" style={{ color: INK }}>
                        {line.itemName || line.itemId}
                      </span>
                      <span className="mt-0.5 block text-[12.5px]" style={{ color: TEXT_MUTED }}>
                        {t("lineQty", { quantity: line.quantity, unit: line.unit })} · {t("unitPrice", { price: formatColones(line.unitPrice, locale, 2) })}
                      </span>
                    </span>
                    <span className="shrink-0 text-[13.5px] font-semibold" style={{ color: INK }}>
                      {formatColones(line.lineTotal, locale, 2)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {detail.timeline.length > 0 && (
            <section aria-labelledby="orders-timeline-title" className="flex flex-col gap-3">
              <h4 id="orders-timeline-title" className="text-[12px] font-bold uppercase" style={{ color: TEXT_MUTED, letterSpacing: "0.1em" }}>
                {t("timelineTitle")}
              </h4>
              <ol className="flex flex-col gap-3 rounded-2xl border bg-white px-4 py-3.5" style={{ borderColor: RULE }}>
                {detail.timeline.map((entry, index) => (
                  <li key={`${entry.status}-${index}`} className="flex items-baseline justify-between gap-3 text-[13.5px]">
                    <span className="font-semibold" style={{ color: INK }}>
                      {statusLabel(entry.status)}
                    </span>
                    <span className="text-[12.5px]" style={{ color: TEXT_MUTED }}>
                      {formatOrderDateTime(entry.date, locale)}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt style={{ color: TEXT_MUTED }}>{label}</dt>
      <dd className="text-right font-medium" style={{ color: INK }}>
        {value}
      </dd>
    </div>
  );
}
