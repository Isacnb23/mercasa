import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* Contenedor canónico del sitio: mismo max-width y padding lateral que el
   navbar/hero (la línea de referencia), para que el borde izquierdo y
   derecho del contenido caigan siempre sobre la misma línea vertical al
   scrollear entre secciones. */
export default function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("mx-auto w-full max-w-[1380px] px-5 md:px-10 lg:px-16", className)}>{children}</div>;
}
