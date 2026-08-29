// Transición Hero → Nosotros: onda BLANCA (sin ninguna capa navy debajo) —
// la sección ya es blanca de por sí, esto es solo un leve movimiento en el
// borde inferior, con una línea azul apenas visible trazando la curva.
export default function HeroWave() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-[-1px] z-10 h-[32px] md:h-[44px]">
      <svg
        className="absolute inset-x-0 bottom-0 h-full w-full"
        viewBox="0 0 1440 44"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0,22 C240,32 480,12 720,20 C960,28 1200,10 1440,18 L1440,44 L0,44 Z"
          fill="#FFFFFF"
        />
        <path
          d="M0,22 C240,32 480,12 720,20 C960,28 1200,10 1440,18"
          stroke="rgba(7,95,216,0.2)"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}
