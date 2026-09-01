// Ícono compartido entre el botón "Escríbanos por WhatsApp" de Contacto
// (ContactSection.tsx) y el CTA "Contactar sobre [segmento]" de Customer
// Class (CustomerClassSection.tsx, ver customer-class-whatsapp-directo.md) —
// vivía duplicado inline en ContactSection.tsx, movido acá para no repetirlo.
export default function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.51 2 12.04 2Zm5.8 14.02c-.24.68-1.4 1.3-1.93 1.38-.5.08-1.12.11-1.81-.11-.42-.13-.95-.31-1.64-.6-2.9-1.25-4.79-4.17-4.94-4.36-.14-.2-1.18-1.57-1.18-3 0-1.42.75-2.12 1.02-2.41.26-.29.57-.36.76-.36h.55c.18 0 .42-.03.65.5.24.55.81 1.93.88 2.07.07.14.12.3.02.49-.1.19-.15.31-.29.48-.14.17-.3.37-.43.5-.14.14-.29.29-.13.57.17.29.75 1.24 1.61 2 1.11.99 2.04 1.3 2.33 1.44.29.15.46.13.63-.07.17-.2.72-.85.91-1.14.19-.29.38-.24.63-.14.26.1 1.63.77 1.91.91.29.14.48.21.55.34.07.13.07.75-.17 1.43Z" />
    </svg>
  );
}
