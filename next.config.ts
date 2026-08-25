import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  images: {
    // 95 para la foto de fondo del Hero en desktop, 90 para su versión
    // mobile; 75 se mantiene como el valor por defecto de Next para el resto.
    qualities: [75, 90, 95],
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
