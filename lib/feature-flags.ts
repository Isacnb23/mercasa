// Bandera del pedido en línea. NEXT_PUBLIC_ENABLE_ORDERING (por defecto apagada): apagada, el carrito
// muestra precios y totales validados pero el botón final sigue siendo "Enviar pedido por WhatsApp";
// encendida, aparece el flujo de 4 pasos (carrito, entrega, pago, resumen y confirmar).
// NEXT_PUBLIC_* se incorpora al compilar: cambiarla exige reiniciar o volver a compilar la web.
export const ORDERING_ENABLED = process.env.NEXT_PUBLIC_ENABLE_ORDERING === "true";
