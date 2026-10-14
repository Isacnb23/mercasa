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
