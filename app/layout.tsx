import type { Metadata } from "next";
import Script from "next/script";
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
        {/*
          Adelanta la descarga del modelo 3D del camión (7.8MB comprimido con
          Draco) al instante en que el documento se parsea, en paralelo con
          la descarga/parseo de los bundles de JS — mucho antes de que
          PageLoader3D monte y arranque su propio fetch. No cambia nada del
          timing/animación del camión: solo hace que sus bytes ya estén en
          caché del navegador cuando el código los pide. Se omite por
          completo si el usuario prefiere menos movimiento, para no gastar
          ancho de banda en quien nunca verá el 3D. `beforeInteractive` lo
          inyecta en el <head> antes de hidratar, vía next/script (evita el
          warning de React por usar un <script> "a mano" dentro del árbol).
        */}
        <Script id="preload-truck-model" strategy="beforeInteractive">
          {`try{if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){var l=document.createElement('link');l.rel='preload';l.as='fetch';l.href='/models/mercasa-truck.glb';l.crossOrigin='anonymous';document.head.appendChild(l);var d=document.createElement('link');d.rel='preload';d.as='fetch';d.href='/draco/draco_decoder.wasm';d.crossOrigin='anonymous';document.head.appendChild(d);}}catch(e){}`}
        </Script>
        <AmbientBackdrop />
        <PageLoader />
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
