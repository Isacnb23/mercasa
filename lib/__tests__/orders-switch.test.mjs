// Prueba con el test runner de Node (npm test). "Mis pedidos" detrás de NEXT_PUBLIC_ENABLE_ORDERING.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (f) => readFileSync(new URL(`../../${f}`, import.meta.url), "utf8");

test("valor por defecto: pedidos apagados; solo 'true' enciende", async () => {
  const previous = process.env.NEXT_PUBLIC_ENABLE_ORDERING;
  try {
    delete process.env.NEXT_PUBLIC_ENABLE_ORDERING;
    const off = await import("../feature-flags.ts?orders-default");
    assert.equal(off.ORDERING_ENABLED, false);

    process.env.NEXT_PUBLIC_ENABLE_ORDERING = "1";
    const notTrue = await import("../feature-flags.ts?orders-one");
    assert.equal(notTrue.ORDERING_ENABLED, false);

    process.env.NEXT_PUBLIC_ENABLE_ORDERING = "true";
    const on = await import("../feature-flags.ts?orders-true");
    assert.equal(on.ORDERING_ENABLED, true);
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_ENABLE_ORDERING;
    else process.env.NEXT_PUBLIC_ENABLE_ORDERING = previous;
  }
});

// El panel y las rutas no se pueden ejecutar con el runner de Node (React, next/server): se comprueba el código.
test("el botón 'Mis pedidos' y su sondeo del panel quedan detrás del interruptor", () => {
  const drawer = read("components/profile/ProfileDrawer.tsx");
  assert.match(drawer, /import \{ ORDERING_ENABLED, REGISTRATION_ENABLED \} from "@\/lib\/feature-flags";/);
  // Apagado no se llama ni a /api/customer/orders desde el panel.
  assert.match(drawer, /if \(!ORDERING_ENABLED \|\| !user \|\| !isOpen \|\| historyAvailable !== null\) return;/);
  assert.match(drawer, /\{ORDERING_ENABLED && historyAvailable === true && \(\s*<button[^]*?setShowingOrders\(true\)/);
  // La única forma de abrir el panel de pedidos es ese botón.
  assert.equal((drawer.match(/setShowingOrders\(true\)/g) ?? []).length, 1);
});

test("las rutas /api/customer/orders responden 404 antes de cualquier otra cosa con pedidos apagados", () => {
  const list = read("app/api/customer/orders/route.ts");
  const detail = read("app/api/customer/orders/[id]/route.ts");
  assert.match(list, /export async function GET\(request: NextRequest\) \{[^]*?if \(!ORDERING_ENABLED\) \{[^]*?status: 404[^]*?\}\s+const \{ page/);
  assert.match(detail, /\{ params \}: \{ params: Promise<\{ id: string \}> \}\) \{[^]*?if \(!ORDERING_ENABLED\) \{[^]*?status: 404[^]*?\}\s+const \{ id \}/);
});

test("el enlace a 'Mis pedidos' del paso de confirmación solo existe dentro del flujo de pedidos", () => {
  const cart = read("components/cart/CartDrawer.tsx");
  assert.match(cart, /const flow = ORDERING_ENABLED && expectPrices/);
});
