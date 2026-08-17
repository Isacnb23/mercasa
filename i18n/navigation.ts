import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Wrappers de next/link, next/navigation conscientes del locale — para que
// el toggle ES/EN (y cualquier link interno futuro) navegue al mismo path
// pero en el otro idioma, en vez de tener que armar la URL a mano.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
