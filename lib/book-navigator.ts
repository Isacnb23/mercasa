// Navegador del libro para el menú "Ir a categoría" (sin React; se prueba con `npm test`). Garantiza UNA sola
// navegación a la vez sobre react-pageflip:
//   - Si el libro está animando (o el usuario arrastra una esquina) o ya hay una navegación en curso, la
//     petición NO se aplica encima: se guarda (gana la última) y se ejecuta cuando el libro vuelve a reposo.
//     Mezclar un `flip` con otra animación reinicia el libro a medias (ver el comentario en
//     ProductCatalogModal.tsx junto a `renderOnlyPageLengthChange`).
//   - Un spread de distancia se anima (una vuelta); más lejos se va directo con `turnToPage`, con una
//     transición breve y suave que pone el componente (o ninguna con prefers-reduced-motion).
//   - Mientras navega, `isBusy()` es true: el componente ignora flechas, rueda y clics en la esquina.
// El plan (quedarse, animar, ir directo) viene de planJump en lib/category-nav: se inyecta para que este módulo no
// dependa de él (las pruebas de Node importan los .ts con extensión; el build no).

export interface BookLike {
  flip(page: number): void;
  turnToPage(page: number): void;
  // "read" = en reposo; "flipping", "user_fold" y "fold_corner" = ocupado.
  getState(): string;
}

export interface BookView {
  currentPage: number;
  totalPages: number;
  portrait: boolean;
}

export type PlanFn = (
  targetPage: number,
  currentPage: number,
  totalPages: number,
  portrait: boolean
) => { kind: "stay" } | { kind: "animate"; page: number } | { kind: "turn"; page: number };

export interface NavigatorDeps {
  plan: PlanFn;
  getBook: () => BookLike | null | undefined;
  getView: () => BookView;
  reducedMotion: () => boolean;
  // Salto directo; el componente lo envuelve con un fundido breve. Por defecto, inmediato.
  turn?: (page: number, apply: () => void) => void;
  onBusyChange?: (busy: boolean) => void;
  // Red de seguridad: si el libro volvió a reposo pero nunca avisó (p. ej. flip() no pudo animar), se libera
  // pasado este tiempo. 0 la desactiva (pruebas).
  watchdogMs?: number;
}

export type GoResult = "stay" | "animate" | "turn" | "queued" | "ignored";

export function createBookNavigator(deps: NavigatorDeps) {
  let busy = false;
  let pending: number | null = null;

  const setBusy = (value: boolean) => {
    if (busy === value) return;
    busy = value;
    deps.onBusyChange?.(value);
  };

  function run(targetPage: number): GoResult {
    const book = deps.getBook();
    if (!book) return "ignored";
    const view = deps.getView();
    const plan = deps.plan(targetPage, view.currentPage, view.totalPages, view.portrait);

    if (plan.kind === "stay") return "stay";

    if (plan.kind === "animate" && !deps.reducedMotion()) {
      setBusy(true);
      book.flip(plan.page); // el libro avisa con onIdle() al terminar la vuelta
      const watchdog = deps.watchdogMs ?? 1800;
      if (watchdog > 0) {
        setTimeout(() => {
          if (busy && book.getState() === "read") api.onIdle();
        }, watchdog);
      }
      return "animate";
    }

    // Varios spreads (o movimiento reducido): directo, sin animación larga.
    setBusy(true);
    const apply = () => {
      book.turnToPage(plan.page);
      setBusy(false);
    };
    if (deps.turn) deps.turn(plan.page, apply);
    else apply();
    return "turn";
  }

  const api = {
    // Pide ir a la primera página de una categoría.
    go(targetPage: number): GoResult {
      const book = deps.getBook();
      if (!book) return "ignored";
      if (busy || book.getState() !== "read") {
        pending = targetPage;
        return "queued";
      }
      return run(targetPage);
    },

    // El libro volvió a reposo (evento changeState "read"): termina la vuelta en curso y aplica lo pendiente.
    onIdle(): void {
      if (pending !== null) {
        const next = pending;
        pending = null;
        setBusy(false);
        run(next);
        return;
      }
      setBusy(false);
    },

    isBusy: () => busy,
    hasPending: () => pending !== null,
  };
  return api;
}
