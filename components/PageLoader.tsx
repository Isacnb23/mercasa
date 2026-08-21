"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import PageLoader3D from "./PageLoader3D";
import styles from "./PageLoader.module.css";
import { cn } from "@/lib/utils";

// El camión 3D (GLB vía Three.js) es el protagonista del loader — un intento
// anterior lo reemplazó por un camión 2D creyendo que resolvía el problema
// de timing, pero eso no era lo pedido: se revirtió. El problema real era
// que la coreografía del camión 3D corría atada a timers independientes de
// la barra de progreso, y el exit podía disparar antes de que la entrada
// terminara de jugarse (se sentía como un flash). La solución: el camión 3D
// tiene su PROPIA secuencia garantizada de 3 fases — entrada → estadía →
// salida — con temporizadores dedicados armados en el instante exacto en
// que corresponde (nunca con una resta retroactiva de "cuánto falta"), que
// corre completa sin importar cuándo dispare window.load. El telón del
// panel arranca RECIÉN cuando esa secuencia termina — nunca antes, nunca
// simultáneo.
const MIN_TIME = 350; // ms — piso mínimo antes de poder cerrar el panel (evita flash en fallback 2D con carga cacheada)
// Debe calzar con ENTER_DURATION en PageLoader3D.tsx: ambos arrancan juntos
// al resolver el modelo, así que si coinciden, la entrada del camión y el
// cierre de la barra a 100% terminan en el mismo instante.
const ENTER_DURATION = 600; // ms — entrada del camión 3D, ease-out
const DWELL_DURATION = 800; // ms — el camión 3D queda visible al centro (idle: ruedas, suspensión, glow — ya animado dentro de PageLoader3D)
// Debe calzar EXACTO con LEAVE_DURATION en PageLoader3D.tsx.
const LEAVE_DURATION_3D = 500; // ms — salida del camión 3D, ease-in-out
// El camión 2D/fallback no tiene coreografía dedicada (su salida sigue atada
// al telón del panel vía CSS, `.isLeaving .truckStage` — como siempre fue,
// ver PageLoader.module.css) porque no depende de ningún asset pesado: no
// hay ningún "flash" que evitar ahí.
// El telón del panel arranca solo después de que el camión (3D o 2D) ya
// salió por completo, así que puede ser corto: no tiene que disimular
// ningún corte, solo cerrar con prolijidad.
const PANEL_LEAVE_DELAY = 130; // debe calzar con la transición de .ui (ver PageLoader.module.css)
const DONE_DELAY = 140; // debe calzar con la transición de .isDone (ver PageLoader.module.css)

const COMPLETE_DURATION = 600; // ms — cierre visual de la barra a 100%, sincronizado con ENTER_DURATION

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Fase del PANEL/telón — ya NO controla al camión 3D directamente (ver
// `truckSignal` más abajo, que es la señal dedicada para eso).
type Phase = "loading" | "leaving" | "done" | "hidden";
// "pending": aún no se decidió 3D vs 2D — no debe montarse NADA que dispare
// la descarga del GLB hasta que el efecto de montaje resuelva reduced-motion.
type Mode = "pending" | "three" | "fallback";

export default function PageLoader() {
  const t = useTranslations("PageLoader");
  const [phase, setPhase] = useState<Phase>("loading");
  const [mode, setMode] = useState<Mode>("pending");
  const [indeterminate, setIndeterminate] = useState(true);
  const [visualProgress, setVisualProgress] = useState(6);
  const [sequenceStarted, setSequenceStarted] = useState(false);
  // Señal DEDICADA para PageLoader3D — independiente de `phase` (el panel).
  // Antes ambos recibían el mismo valor, así que el camión salía de cuadro
  // exactamente cuando el panel empezaba su telón; ahora el panel espera a
  // que esto llegue a "leaving" Y a que el camión termine de salir (ver
  // truckGoneRef) antes de arrancar el suyo.
  const [truckSignal, setTruckSignal] = useState<"loading" | "leaving">("loading");

  const reducedRef = useRef(false);
  const resolvedRef = useRef(false);
  const showcaseRef = useRef(false); // true solo si cargó el camión 3D (no fallback 2D)
  const truckGoneRef = useRef(false); // true cuando el camión (3D o 2D) ya completó su salida
  const pageLoadedRef = useRef(false);
  const minTimeDoneRef = useRef(false);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout> | undefined>>({});

  // Progreso "objetivo" (crudo, puede saltar) vs. "visual" (suavizado, el
  // que se pinta). completionStartRef marca cuándo empezó el cierre a 100%.
  const progressRef = useRef(6);
  const targetRef = useRef(12);
  const completionStartRef = useRef(0);
  const completionFromRef = useRef(6);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      let next = progressRef.current;

      if (sequenceStarted && completionStartRef.current > 0) {
        const tt = Math.min(1, (now - completionStartRef.current) / COMPLETE_DURATION);
        next = completionFromRef.current + (100 - completionFromRef.current) * easeInOutCubic(tt);
        if (tt >= 1) next = 100;
      } else {
        // Sin Content-Length (indeterminado): sigue avanzando hasta 84% para
        // no verse congelada mientras se espera la descarga real del GLB.
        if (indeterminate) {
          targetRef.current = Math.min(84, targetRef.current + dt * 8);
        }
        const target = Math.min(90, targetRef.current);
        const smoothing = 1 - Math.exp(-dt * 5.5);
        next += (target - next) * smoothing;
      }

      progressRef.current = next;
      setVisualProgress(next);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [sequenceStarted, indeterminate]);

  // Se cumple cuando el camión ya salió de cuadro por completo, la página
  // terminó de cargar Y pasó el piso mínimo. Gobierna cuándo arranca el
  // telón del panel — nunca antes de que el camión termine su salida.
  const tryFinish = useCallback(() => {
    if (!resolvedRef.current || !pageLoadedRef.current) return;
    if (!minTimeDoneRef.current) return;
    if (!truckGoneRef.current) return;
    if (timersRef.current.leave) return; // ya se programó la salida del panel

    timersRef.current.leave = setTimeout(() => {
      setPhase("leaving");
      timersRef.current.done = setTimeout(() => {
        setPhase("done");
        timersRef.current.hide = setTimeout(() => setPhase("hidden"), DONE_DELAY);
      }, PANEL_LEAVE_DELAY);
    }, 0);
  }, []);

  const handleResolved = useCallback(
    (isThreeTruck: boolean) => {
      if (!resolvedRef.current) {
        resolvedRef.current = true;
        showcaseRef.current = isThreeTruck;
        // Dispara el cierre suave de la barra hasta 100% desde el valor
        // actual. Arranca en el mismo instante que la entrada del camión,
        // así ambos llegan a su remate juntos (ver COMPLETE_DURATION /
        // ENTER_DURATION arriba).
        completionFromRef.current = progressRef.current;
        completionStartRef.current = performance.now();
        setSequenceStarted(true);

        if (isThreeTruck) {
          // Secuencia garantizada: entrada → estadía → salida, con
          // temporizadores dedicados armados AHORA (al resolver el GLB) —
          // corre completa sin importar cuándo termine de cargar el resto
          // de la página.
          timersRef.current.dwellStart = setTimeout(() => {
            timersRef.current.leaveStart = setTimeout(() => {
              setTruckSignal("leaving");
              timersRef.current.truckGone = setTimeout(() => {
                truckGoneRef.current = true;
                tryFinish();
              }, LEAVE_DURATION_3D);
            }, DWELL_DURATION);
          }, ENTER_DURATION);
        } else {
          // 2D/fallback: sin coreografía dedicada que proteger — su salida
          // queda atada al telón del panel (.isLeaving .truckStage), como
          // siempre fue.
          truckGoneRef.current = true;
        }
      }
      tryFinish();
    },
    [tryFinish]
  );

  const handleFallback = useCallback(() => {
    setMode("fallback");
    setIndeterminate(true);
    handleResolved(false); // 2D: sin coreografía dedicada (se muestra al instante)
  }, [handleResolved]);

  useEffect(() => {
    reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedRef.current) {
      // Menos movimiento: nunca se inicializa Three.js ni se descargan los
      // ~55MB del GLB — directo al loader 2D existente, sin piso mínimo
      // artificial.
      minTimeDoneRef.current = true;
      setMode("fallback");
      handleResolved(false);
    } else {
      setMode("three");
      timersRef.current.minTime = setTimeout(() => {
        minTimeDoneRef.current = true;
        tryFinish();
      }, MIN_TIME);
    }

    function onWindowLoad() {
      pageLoadedRef.current = true;
      tryFinish();
    }

    if (document.readyState === "complete") {
      onWindowLoad();
    } else {
      window.addEventListener("load", onWindowLoad);
    }

    return () => {
      window.removeEventListener("load", onWindowLoad);
      Object.values(timersRef.current).forEach((timer) => clearTimeout(timer));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tryFinish/handleResolved son estables (refs)
  }, []);

  if (phase === "hidden") return null;

  const leavingOrDone = phase === "leaving" || phase === "done";
  const complete = visualProgress >= 99.95;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={t("ariaLabel")}
      className={cn(styles.loader, leavingOrDone && styles.isLeaving, phase === "done" && styles.isDone)}
    >
      <div className={styles.vignette} />
      <div className={cn(styles.streak, styles.s1)} />
      <div className={cn(styles.streak, styles.s2)} />
      <div className={cn(styles.spark, styles.k1)} />
      <div className={cn(styles.spark, styles.k2)} />

      {mode === "three" && (
        <PageLoader3D
          phase={truckSignal}
          onProgress={(p) => {
            setIndeterminate(false);
            // El progreso de red llega 0..100. Se reserva el último tramo
            // (90..100) para el cierre suave que dispara handleResolved, así
            // la barra nunca "toca" el 100% antes de que el camión esté listo.
            const mapped = Math.min(90, 8 + p * 0.82);
            targetRef.current = Math.max(targetRef.current, mapped);
          }}
          onIndeterminate={() => {
            setIndeterminate(true);
            targetRef.current = Math.max(targetRef.current, 18);
          }}
          onResolved={() => handleResolved(true)}
          onFallback={handleFallback}
        />
      )}
      {mode === "fallback" && (
        <div className={styles.scene}>
          <Truck2D />
          <div className={styles.road}>
            <div className={styles.roadLine} />
          </div>
        </div>
      )}
      {/* mode === "pending": aún resolviendo reduced-motion, no se monta ninguna escena */}

      <div className={cn(styles.ui, mode === "three" && styles.uiBottom, complete && styles.isComplete)}>
        <div className={styles.uiPanel}>
          <div className={styles.uiKicker}>
            <span className={styles.uiDot} /> {t("kicker")}
          </div>
          <div className={styles.brand}>MERCASA</div>
          {mode === "three" && <div className={styles.sub}>{t("sub")}</div>}
          <div className={styles.panelLine} />
          <div className={styles.progressTrack}>
            {indeterminate ? (
              <span className={cn(styles.progressFill, styles.sweep)} />
            ) : (
              <span className={styles.progressFill} style={{ width: `${visualProgress.toFixed(1)}%` }} />
            )}
          </div>
          <div className={styles.loaderMeta}>
            <div className={styles.caption}>{complete ? t("captionReady") : t("captionLoading")}</div>
            {mode === "three" && <div className={styles.percent}>{Math.round(visualProgress)}%</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Camión 2D ilustrado — fallback cuando hay reduced-motion, timeout o error del GLB. */
function Truck2D() {
  return (
    <div className={styles.truckStage}>
      <div className={styles.truckWrap}>
        <span className={cn(styles.speed, styles.v1)} />
        <span className={cn(styles.speed, styles.v2)} />
        <span className={cn(styles.speed, styles.v3)} />

        <svg
          className={styles.truckSvg}
          viewBox="0 0 320 150"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* ===== HUMO DEL ESCAPE ===== */}
          <circle className={styles.puff} cx="16" cy="100" r="6" />
          <circle className={cn(styles.puff, styles.p2)} cx="16" cy="100" r="5" />
          <circle className={cn(styles.puff, styles.p3)} cx="16" cy="100" r="6.5" />

          {/* tubo de escape */}
          <rect className={styles.bodyFill} x="20" y="97" width="13" height="6" rx="3" />

          {/* ===== CAJA DE CARGA ===== */}
          <rect className={styles.bodyFill} x="30" y="20" width="162" height="76" rx="5" />
          <rect className={styles.cut} x="41" y="31" width="140" height="54" rx="3" />
          {/* bisagra de la puerta trasera */}
          <rect
            className={styles.bodyFill}
            x="47"
            y="36"
            width="3"
            height="44"
            rx="1.5"
            opacity=".5"
          />

          {/* ===== CABINA ===== */}
          <path
            className={styles.bodyFill}
            d="M192 96 V37 a5 5 0 0 1 5 -5 h48 a7 7 0 0 1 5 2 l31 33 a9 9 0 0 1 3 6 V96 Z"
          />

          {/* parabrisas */}
          <path className={styles.cut} d="M206 44 h34 l24 26 h-58 Z" />

          {/* conductor (silueta discreta) */}
          <circle className={styles.bodyFill} cx="221" cy="55" r="5.2" />
          <path className={styles.bodyFill} d="M212 70 a9.5 9.5 0 0 1 19 0 z" />

          {/* línea de la puerta + manija */}
          <rect
            className={styles.bodyFill}
            x="200"
            y="78"
            width="34"
            height="2.6"
            rx="1.3"
            opacity=".85"
          />
          <rect
            className={styles.bodyFill}
            x="200"
            y="85"
            width="11"
            height="2.6"
            rx="1.3"
            opacity=".85"
          />

          {/* espejo retrovisor */}
          <rect className={styles.bodyFill} x="242" y="40" width="3.4" height="12" rx="1.7" />
          <rect className={styles.bodyFill} x="238" y="44" width="5" height="2.4" rx="1.2" />

          {/* parrilla + faro */}
          <rect
            className={styles.bodyFill}
            x="268"
            y="76"
            width="13"
            height="3"
            rx="1.5"
            opacity=".85"
          />
          <rect className={styles.bodyFill} x="268" y="84" width="13" height="7" rx="2.5" />

          {/* chasis */}
          <rect className={styles.bodyFill} x="26" y="96" width="258" height="6.5" rx="3" />

          {/* estribo / tanque bajo la cabina */}
          <rect
            className={styles.bodyFill}
            x="198"
            y="103"
            width="34"
            height="8"
            rx="3"
            opacity=".9"
          />

          {/* guardabarros trasero */}
          <rect
            className={styles.bodyFill}
            x="62"
            y="100"
            width="4.5"
            height="15"
            rx="2"
            opacity=".75"
          />

          {/* ===== RUEDA TRASERA ===== */}
          <g className={styles.wheel}>
            <circle className={styles.bodyFill} cx="88" cy="104" r="18" />
            <circle className={styles.tread} cx="88" cy="104" r="15" />
            <circle className={styles.cut} cx="88" cy="104" r="11.5" />
            <line className={styles.spoke} x1="88" y1="94" x2="88" y2="114" />
            <line className={styles.spoke} x1="78" y1="104" x2="98" y2="104" />
            <line className={styles.spoke} x1="81" y1="97" x2="95" y2="111" />
            <line className={styles.spoke} x1="95" y1="97" x2="81" y2="111" />
            <circle className={styles.bodyFill} cx="88" cy="104" r="6" />
            <circle className={styles.cut} cx="88" cy="104" r="2.4" />
          </g>

          {/* ===== RUEDA DELANTERA ===== */}
          <g className={styles.wheel}>
            <circle className={styles.bodyFill} cx="246" cy="104" r="18" />
            <circle className={styles.tread} cx="246" cy="104" r="15" />
            <circle className={styles.cut} cx="246" cy="104" r="11.5" />
            <line className={styles.spoke} x1="246" y1="94" x2="246" y2="114" />
            <line className={styles.spoke} x1="236" y1="104" x2="256" y2="104" />
            <line className={styles.spoke} x1="239" y1="97" x2="253" y2="111" />
            <line className={styles.spoke} x1="253" y1="97" x2="239" y2="111" />
            <circle className={styles.bodyFill} cx="246" cy="104" r="6" />
            <circle className={styles.cut} cx="246" cy="104" r="2.4" />
          </g>
        </svg>
      </div>
    </div>
  );
}
