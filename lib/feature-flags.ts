// Bandera del pedido en línea. NEXT_PUBLIC_ENABLE_ORDERING (por defecto apagada): apagada, el carrito
// muestra precios y totales validados pero el botón final sigue siendo "Enviar pedido por WhatsApp";
// encendida, aparece el flujo de 4 pasos (carrito, entrega, pago, resumen y confirmar).
// NEXT_PUBLIC_* se incorpora al compilar: cambiarla exige reiniciar o volver a compilar la web.
export const ORDERING_ENABLED = process.env.NEXT_PUBLIC_ENABLE_ORDERING === "true";

// Bandera del registro de clientes (/registro y el enlace "Crear cuenta" del login). NEXT_PUBLIC_ENABLE_REGISTRATION
// (por defecto apagada): apagada, el enlace no se muestra, la página /registro da 404 y las rutas /api/register/* también.
// NEXT_PUBLIC_* se incorpora al compilar: cambiarla exige reiniciar o volver a compilar la web. Aparte, el servidor
// (homex-api, Registration:Enabled) tiene su propio interruptor para el paso que crea el cliente.
export const REGISTRATION_ENABLED = process.env.NEXT_PUBLIC_ENABLE_REGISTRATION === "true";

// Precios con sesión del catálogo (POST /api/catalog/prices). NEXT_PUBLIC_ENABLE_CATALOG_PRICES (por defecto APAGADA; solo
// el valor "true" la enciende): apagada, el navegador no pide precios ni presentaciones, no sale ningún aviso de precios y los
// productos se ven como para un cliente sin sesión; la ruta del servidor responde 404 sin llamar a mercasa-api. Se enciende
// cuando homex-api tenga Catalog/Prices. NEXT_PUBLIC_* se incorpora al compilar: exige reiniciar o volver a compilar.
export const catalogPricesEnabled = (value: string | undefined): boolean => value === "true";
export const CATALOG_PRICES_ENABLED = catalogPricesEnabled(process.env.NEXT_PUBLIC_ENABLE_CATALOG_PRICES);
