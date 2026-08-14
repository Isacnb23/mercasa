"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PageLoader3D from "./PageLoader3D";
import styles from "./PageLoader.module.css";
import { cn } from "@/lib/utils";

const MIN_TIME = 2200; // tiempo mínimo visible desde el montaje (ms)
// Tiempo mínimo que el camión 3D permanece EN PANTALLA desde que el modelo
// terminó de cargar: cubre la entrada (ENTER_DURATION ~1400ms) + una pausa
// al centro. Es clave porque el GLB es pesado: si tarda más que MIN_TIME en
// descargar, sin esto el overlay saldría en el instante en que carga (wait=0)
// y no se vería ni la entrada ni el camión centrado.
const SHOWCASE_3D = 3800;
const LEAVE_DELAY = 1000; // debe calzar con la salida del camión 3D (LEAVE_DURATION)
const DONE_DELAY = 850; // debe calzar con la transición de .is-done

type Phase = "loading" | "leaving" | "done" | "hidden";
// "pending": aún no se decidió 3D vs 2D — no debe montarse NADA que dispare
// la descarga del GLB hasta que el efecto de montaje resuelva reduced-motion.
// Si "three" arrancara como valor por defecto, PageLoader3D montaría (y
// pediría el .glb) en el mismo commit, antes de que este componente alcance
// a corregir a "fallback" para reduced-motion.
type Mode = "pending" | "three" | "fallback";

export default function PageLoader() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [mode, setMode] = useState<Mode>("pending");
  const [progress, setProgress] = useState(0);
  const [indeterminate, setIndeterminate] = useState(true);

  const startRef = useRef(0);
  const reducedRef = useRef(false);
  const resolvedRef = useRef(false);
  const resolvedAtRef = useRef(0); // instante en que el modelo quedó listo
  const showcaseRef = useRef(false); // true solo si cargó el camión 3D (no fallback)
  const pageLoadedRef = useRef(false);
  const timersRef = useRef<{
    leave?: ReturnType<typeof setTimeout>;
    done?: ReturnType<typeof setTimeout>;
    hide?: ReturnType<typeof setTimeout>;
  }>({});

  // Se cumple cuando el modelo 3D ya resolvió (cargó o cayó al fallback 2D) Y
  // la página terminó de cargar. Gobierna cuándo pasa a "leaving" — ni el
  // three.js ni el 2D deciden por su cuenta cuándo se oculta el overlay.
  const tryFinish = useCallback(() => {
    if (!resolvedRef.current || !pageLoadedRef.current) return;
    if (timersRef.current.leave) return; // ya se programó la salida

    const now = Date.now();
    let wait = reducedRef.current ? 0 : Math.max(0, MIN_TIME - (now - startRef.current));
    // Con camión 3D, garantizar que se vea EN PANTALLA el tiempo de showcase
    // desde que cargó (entrada + pausa), aunque la descarga haya tardado mucho.
    if (showcaseRef.current) {
      wait = Math.max(wait, SHOWCASE_3D - (now - resolvedAtRef.current));
    }
    timersRef.current.leave = setTimeout(() => {
      setPhase("leaving");
      timersRef.current.done = setTimeout(() => {
        setPhase("done");
        timersRef.current.hide = setTimeout(() => setPhase("hidden"), DONE_DELAY);
      }, LEAVE_DELAY);
    }, wait);
  }, []);

  const handleResolved = useCallback(
    (isThreeTruck: boolean) => {
      if (!resolvedRef.current) {
        resolvedRef.current = true;
        resolvedAtRef.current = Date.now();
        showcaseRef.current = isThreeTruck;
      }
      tryFinish();
    },
    [tryFinish]
  );

  const handleFallback = useCallback(() => {
    setMode("fallback");
    setIndeterminate(true);
    handleResolved(false); // 2D: sin showcase largo (se muestra al instante)
  }, [handleResolved]);

  useEffect(() => {
    startRef.current = Date.now();
    reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedRef.current) {
      // Menos movimiento: nunca se inicializa Three.js ni se descargan los
      // ~55MB del GLB — directo al loader 2D existente.
      setMode("fallback");
      handleResolved(false);
    } else {
      setMode("three");
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
      clearTimeout(timersRef.current.leave);
      clearTimeout(timersRef.current.done);
      clearTimeout(timersRef.current.hide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tryFinish/handleResolved son estables (refs)
  }, []);

  if (phase === "hidden") return null;

  const leavingOrDone = phase === "leaving" || phase === "done";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Cargando Mercasa"
      className={cn(styles.loader, leavingOrDone && styles.isLeaving, phase === "done" && styles.isDone)}
    >
      <div className={styles.vignette} />
      <div className={cn(styles.streak, styles.s1)} />
      <div className={cn(styles.streak, styles.s2)} />
      <div className={cn(styles.spark, styles.k1)} />
      <div className={cn(styles.spark, styles.k2)} />

      {mode === "three" && (
        <PageLoader3D
          phase={phase}
          onProgress={(p) => {
            setIndeterminate(false);
            setProgress(p);
          }}
          onIndeterminate={() => setIndeterminate(true)}
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

      <div className={cn(styles.ui, mode === "three" && styles.uiBottom)}>
        <div className={styles.brand}>MERCASA</div>
        {mode === "three" && <div className={styles.sub}>Logística &amp; Distribución</div>}
        <div className={styles.bar}>
          {indeterminate ? (
            <span className={styles.barFillSweep} />
          ) : (
            <span className={styles.barFillReal} style={{ width: `${Math.round(progress)}%` }} />
          )}
        </div>
        <div className={styles.caption}>Preparando su pedido</div>
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
