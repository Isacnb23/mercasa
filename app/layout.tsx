import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource/spectral/400.css";
import "@fontsource/spectral/500.css";
import "@fontsource/spectral/600.css";
import "@fontsource/spectral/700.css";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import PageLoader from "@/components/PageLoader";
import AmbientBackdrop from "@/components/AmbientBackdrop";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.mercasa.cr"),
  title: {
    default: "Mercasa | Distribución mayorista de consumo masivo en Costa Rica",
    template: "%s | Mercasa",
  },
  description:
    "Mercasa, empresa de Grupo Inteca, es líder en importación, comercialización y distribución mayorista de productos de consumo masivo en Costa Rica. Más de 60 años de trayectoria, 2 CEDIs propios y cobertura nacional.",
  keywords: [
    "Mercasa",
    "Distribuidora Mercasa",
    "Grupo Inteca",
    "distribución mayorista Costa Rica",
    "consumo masivo",
    "FMCG Costa Rica",
    "Cartago",
    "El Guarco",
  ],
  openGraph: {
    title: "Mercasa | Distribución mayorista de consumo masivo en Costa Rica",
    description:
      "Importación, logística y distribución mayorista de consumo masivo. Una empresa de Grupo Inteca, con más de 60 años de trayectoria.",
    url: "https://www.mercasa.cr",
    siteName: "Mercasa",
    locale: "es_CR",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-ink text-mist-100 antialiased">
        <AmbientBackdrop />
        <PageLoader />
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
