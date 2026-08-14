import { MapPin, Mail, Phone, Truck } from "lucide-react";
import { navLinks, site } from "@/lib/data";

function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M13.5 9H15V6.5h-1.5C11.6 6.5 10 8.1 10 10.2V12H8v2.5h2V21h2.5v-6.5H15l.5-2.5h-3v-1.6c0-.6.4-1 1-1Z" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="relative overflow-hidden px-4 pb-10 pt-6 md:px-8 md:pb-14">
      <div className="relative z-10 mx-auto max-w-7xl rounded-[40px] border border-white/10 bg-gradient-to-b from-navy-900/90 to-navy-950 p-8 shadow-[0_40px_90px_-40px_rgba(0,0,0,0.6)] md:p-12">
        <div className="grid gap-10 border-b border-white/10 pb-12 md:grid-cols-[1.3fr_0.8fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5 text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700">
                <Truck className="h-5 w-5 text-white" />
              </span>
              <span className="font-display text-lg font-semibold">
                {site.name}
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-mist-200/65">
              Empresa de {site.parentCompany}, fundada en {site.foundedYear}.
              Importación, logística y distribución mayorista de consumo
              masivo en todo Costa Rica.
            </p>
            <a
              href={site.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-mist-200/70 transition duration-300 hover:-translate-y-1 hover:bg-white/10 hover:text-white"
              aria-label="Mercasa en Facebook"
            >
              <FacebookIcon className="h-4 w-4" />
            </a>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-mist-200/40">
              Navegación
            </p>
            <ul className="mt-4 space-y-2.5 text-sm text-mist-200/70">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="transition hover:text-white">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-mist-200/40">
              Contacto
            </p>
            <ul className="mt-4 space-y-3 text-sm text-mist-200/70">
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
                <span>{site.address.line1}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-teal-400" />
                <a href={site.phoneHref} className="hover:text-white">
                  {site.phone}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-teal-400" />
                <a href={`mailto:${site.emails.comunicaciones}`} className="hover:text-white">
                  {site.emails.comunicaciones}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-6 text-xs text-mist-200/35 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {site.name} · {site.parentCompany}. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
