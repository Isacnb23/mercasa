// Tokens visuales compartidos por los drawers del sitio (carrito y perfil): navy / beige /
// dorado de la marca. TEXT_MUTED es el gris para texto legible (contraste AA sobre blanco,
// beige y BODY_BG); MUTED (#8493A5) solo para detalles decorativos como íconos.
export const INK = "#082B5C";
export const ACCENT = "#075FD8";
export const TEXT_MUTED = "#5C6B7D";
export const MUTED = "#8493A5";
export const RULE = "#E9E3D8";
export const BEIGE = "#F1ECE4";
export const BODY_BG = "#FBF9F5";
export const GOLD = "#FFD21A";
// Fondo suave del elemento elegido (chip de fecha, dirección activa).
export const SELECTED_BG = "#EAF0F8";
export const DANGER_BG = "#FDECEC";
export const DANGER_TEXT = "#B3261E";

export const FOCUS_RING =
  "outline-none focus-visible:ring-2 focus-visible:ring-[#075FD8] focus-visible:ring-offset-2";

// Botón principal: navy a todo el ancho, ≥ 48 px.
export const PRIMARY_BUTTON =
  "flex min-h-[50px] w-full items-center justify-center gap-2.5 rounded-full px-5 text-[15px] font-semibold text-white motion-safe:transition motion-safe:duration-200 hover:brightness-110 motion-safe:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 " +
  FOCUS_RING;

// Acción secundaria: borde fino, fondo blanco.
export const SECONDARY_BUTTON =
  "flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border bg-white px-5 text-[14px] font-semibold motion-safe:transition motion-safe:duration-150 hover:bg-[#F1ECE4] " +
  FOCUS_RING;

// Campos de formulario: borde suave, foco claro.
export const FIELD_CLASS =
  "min-h-[48px] w-full rounded-xl border bg-white px-4 py-3 text-[14px] outline-none motion-safe:transition motion-safe:duration-150 placeholder:text-[#8493A5] hover:border-[#B9C6D8] focus:border-[#075FD8] focus:ring-2 focus:ring-[#075FD8]/25 disabled:cursor-not-allowed disabled:bg-[#F7F8FA] disabled:opacity-70";
