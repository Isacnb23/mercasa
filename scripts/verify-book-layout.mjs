// Barrido de tamaños de ventana contra el libro del catálogo: verifica que la rejilla de tarjetas NO desborde.
//
// Uso (web en :3000 con sus APIs arriba; Chrome headless por playwright-core, que NO es dependencia de producción):
//   npm i --no-save playwright-core && node scripts/verify-book-layout.mjs [--sizes=1792x860,1366x768]
//        [--state=both|session|mixed|loading|nosession] [--base=http://localhost:3000] [--family=Alimentos] [--json=salida.json] [--verbose] [--both-ways]
//   Chrome: CHROME_PATH=/ruta/a/chrome.exe (si no, el Chromium que instaló playwright).
//
// Sin --sizes recorre anchos 360…2560 × altos 560…1080. Por cada ancho abre la revista UNA vez y cambia el alto de la
// ventana (así también se prueba el reajuste al redimensionar). Para cada combinación inyecta el "peor caso" en las
// tarjetas visibles (nombre largo, empaque largo) y mide, por hoja con la rejilla llena:
//   - la rejilla no tiene barra interna (scrollHeight <= clientHeight),
//   - ninguna tarjeta queda cortada por el borde de la rejilla ni de la hoja,
//   - ningún texto se sale de su tarjeta,
//   - la hoja entra completa entre el encabezado y el pie del modal.
// Estados: "session" (precios simulados: dos líneas de precio), "mixed" (precio de domicilio sin precio de retiro:
// precio + las dos etiquetas de canal), "loading" (sesión con precios que no llegan:
// esqueletos + aviso arriba + las dos etiquetas) y "nosession" (sin sesión: aviso de precios arriba, que le quita
// alto al libro, y las dos etiquetas de canal). Sale con código 1 si alguna combinación falla.
import fs from "node:fs";

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

let chromium;
try {
  ({ chromium } = await import("playwright-core"));
} catch {
  console.error("Falta playwright-core: npm i --no-save playwright-core");
  process.exit(2);
}

const BASE = arg("base", "http://localhost:3000");
const FAMILY = arg("family", "Alimentos");
const STATE = arg("state", "both");
const WIDTHS = [360, 414, 768, 1024, 1280, 1366, 1440, 1536, 1600, 1792, 1920, 2560];
const HEIGHTS = [560, 640, 720, 800, 860, 900, 1000, 1080];
const sizesArg = arg("sizes", "");
const SIZES = sizesArg
  ? sizesArg.split(",").map((s) => s.split("x").map(Number))
  : WIDTHS.flatMap((w) => HEIGHTS.map((h) => [w, h]));
const states = STATE === "both" ? ["nosession", "loading", "mixed", "session"] : [STATE];

const LONG_NAME = "Helado Premium Cremoso Sabor Vainilla con Trozos de Chocolate Belga y Galleta Familiar Extra Grande";
const LONG_PACK = "CAJA 24 x 355 ML DISPLAY";
const LONG_TITLE = "Helados, Postres y Cremas Congeladas Premium";

async function launch() {
  const executablePath = process.env.CHROME_PATH || undefined;
  return chromium.launch(executablePath ? { executablePath } : {});
}

async function mockSession(page, mode = "normal") {
  const hangPrices = mode === "loading";
  await page.route("**/api/auth/session", (r) =>
    r.fulfill({ json: { user: { accountNum: "TEST", name: "Prueba", email: "t@example.com" } } }),
  );
  await page.route("**/api/catalog/prices", async (r) => {
    // "loading": los precios nunca llegan (esqueletos de precio + las dos etiquetas de canal + aviso arriba).
    if (hangPrices) return new Promise(() => {});
    const body = JSON.parse(r.request().postData() || "{}");
    const units = ["UND", "CAJA", "DISPLAY"];
    const prices = (body.itemIds || []).map((id, i) => ({
      itemId: id,
      unitPrice: 6290.54 + i * 137.31,
      tax: 817.84 + i * 17.2,
      unit: units[i % 3],
      hasDelivery: true,
      // "mixed": precio de domicilio pero sin precio de retiro => precio de dos líneas + las DOS etiquetas de canal.
      pickup: mode === "mixed" ? null : { unitPrice: 3490.56 + i * 51, tax: 453.44 + i * 6, unit: units[(i + 1) % 3], varies: false, bySite: [] },
    }));
    await r.fulfill({ json: { prices, missing: [], priceListMissing: false } });
  });
}

async function openBook(page) {
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(4000);
  const open = page.locator("button", { hasText: /Catálogo general/i }).first();
  await open.scrollIntoViewIfNeeded();
  await open.click();
  await page.waitForTimeout(1500);
  await page.locator(`button[aria-label="Ver revista de ${FAMILY}"]`).evaluate((e) => e.click());
  await page.waitForTimeout(4500);
}

// Hojas visibles del spread con su rejilla; "llena" = trae las tarjetas por hoja que anuncia (data-per-page, o 9).
const visibleGrids = `(() => [...document.querySelectorAll(".page-content .grid")].filter((g) => {
  const r = g.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth && g.querySelector("[role=button]");
}))()`;

async function fullGridsCount(page) {
  return page.evaluate(`(() => ${visibleGrids}.filter((g) => g.querySelectorAll(":scope > [role=button]").length === Number(g.dataset.perPage || 9)).length)()`);
}

async function goToFullSpread(page, max = 14) {
  for (let i = 0; i < max; i++) {
    if ((await fullGridsCount(page)) >= 1) return true;
    await page.locator('button[aria-label="Siguiente"]').first().evaluate((e) => e.click()).catch(() => {});
    await page.waitForTimeout(900);
  }
  return (await fullGridsCount(page)) >= 1;
}

async function settle(page) {
  let last = "";
  let same = 0;
  for (let i = 0; i < 40 && same < 4; i++) {
    await page.waitForTimeout(200);
    const now = await page.evaluate(`(() => JSON.stringify([...document.querySelectorAll(".page-content")].filter((e) => e.getBoundingClientRect().width > 0).map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })) + (document.querySelector(".catalog-panel")?.dataset.density || "") + (document.querySelector(".page-content .grid")?.dataset.perPage || ""))()`);
    same = now === last ? same + 1 : 0;
    last = now;
  }
}

function measureSource(longName, longPack, longTitle) {
  return `(() => {
  const LONG_TITLE = ${JSON.stringify(longTitle)};
  const LONG_NAME = ${JSON.stringify(longName)};
  const LONG_PACK = ${JSON.stringify(longPack)};
  const panel = document.querySelector(".catalog-panel");
  const footer = document.querySelector(".catalog-footer");
  const grids = ${visibleGrids};
  const out = { density: panel?.dataset.density ?? null, sheets: [], anchor: null, problems: [] };
  for (const g of grids) {
    const cards = [...g.querySelectorAll(":scope > [role=button]")];
    const per = Number(g.dataset.perPage || 9);
    if (cards.length !== per) continue;
    if (!out.anchor) out.anchor = cards[0].getAttribute("aria-label");
    // Peor caso: título de categoría de dos líneas y nombre/empaque largos en cada tarjeta.
    const title = g.closest(".page-content")?.querySelector("h3");
    if (title) title.textContent = LONG_TITLE;
    for (const c of cards) {
      const ps = [...c.querySelectorAll(":scope > p")];
      if (ps[0]) ps[0].textContent = LONG_NAME;
      if (ps[1] && /\\d/.test(ps[1].textContent || "") && !ps[1].textContent.includes("₡")) ps[1].textContent = LONG_PACK;
    }
    const gr = g.getBoundingClientRect();
    const sheet = g.closest(".page-content");
    const sr = sheet.getBoundingClientRect();
    const sheetCut = footer ? sr.bottom > footer.getBoundingClientRect().top + 1 : false;
    const info = {
      perPage: per,
      sheet: [Math.round(sr.width), Math.round(sr.height)],
      grid: [Math.round(gr.width), Math.round(gr.height)],
      gridScroll: g.scrollHeight > g.clientHeight,
      gridScrollBy: g.scrollHeight - g.clientHeight,
      sheetCut,
      cutCards: 0,
      overflowCards: 0,
      textOut: 0,
      detail: [],
    };
    for (const c of cards) {
      const cr = c.getBoundingClientRect();
      if (cr.top < gr.top - 0.5 || cr.bottom > gr.bottom + 0.5 || cr.left < gr.left - 0.5 || cr.right > gr.right + 0.5) {
        info.cutCards++;
        info.detail.push("tarjeta cortada (arriba " + (gr.top - cr.top).toFixed(1) + ", abajo " + (cr.bottom - gr.bottom).toFixed(1) + ", izq " + (gr.left - cr.left).toFixed(1) + ", der " + (cr.right - gr.right).toFixed(1) + ")");
      }
      if (c.scrollHeight > c.clientHeight + 0.5) {
        info.overflowCards++;
        info.detail.push("contenido de tarjeta desbordado " + (c.scrollHeight - c.clientHeight));
      }
      const walker = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
      let n;
      let bad = false;
      while ((n = walker.nextNode())) {
        if (!n.textContent.trim()) continue;
        const el = n.parentElement;
        if (el.closest("button")) continue;
        const clamped = el.closest("p")?.style.webkitLineClamp;
        const rect = clamped ? el.closest("p").getBoundingClientRect() : (() => { const r = document.createRange(); r.selectNodeContents(n); return r.getBoundingClientRect(); })();
        if (rect.right > cr.right + 0.5 || rect.left < cr.left - 0.5 || rect.bottom > cr.bottom + 0.5 || rect.top < cr.top - 0.5) bad = true;
      }
      if (bad) {
        info.textOut++;
        info.detail.push("texto fuera de la tarjeta");
      }
    }
    out.sheets.push(info);
  }
  return out;
})()`;
}

async function measure(page) {
  // El cursor encima de una tarjeta la sube 2 px (hover:-translate-y-0.5): se aparta para medir en reposo.
  await page.mouse.move(0, 0);
  await page.waitForTimeout(350);
  const m = await page.evaluate(measureSource(LONG_NAME, LONG_PACK, LONG_TITLE));
  m.pass = m.sheets.length > 0 && m.sheets.every((s) => !s.gridScroll && !s.sheetCut && !s.cutCards && !s.overflowCards && !s.textOut);
  return m;
}

const rows = [];
const browser = await launch();
const byWidth = new Map();
for (const [w, h] of SIZES) (byWidth.get(w) ?? byWidth.set(w, []).get(w)).push(h);

for (const state of states) {
  for (const [w, heights] of byWidth) {
    const ctx = await browser.newContext({ viewport: { width: w, height: heights[0] } });
    const page = await ctx.newPage();
    if (state !== "nosession") await mockSession(page, state);
    await openBook(page);
    // De menor a mayor alto; con --both-ways también de vuelta (de mayor a menor) para probar el reajuste en vivo
    // en las dos direcciones (el doble de lento).
    const order = [...heights].sort((a, b) => a - b);
    const sequence = process.argv.includes("--both-ways") && order.length > 2 ? [...order, ...[...order].reverse().slice(1, -1)] : order;
    let reported = new Set();
    for (const h of sequence) {
      await page.setViewportSize({ width: w, height: h });
      await settle(page);
      const reachable = await goToFullSpread(page);
      await settle(page);
      let m = reachable ? await measure(page) : { pass: false, sheets: [], density: null, anchor: null };
      const key = `${state}|${w}x${h}`;
      const row = {
        state,
        size: `${w}x${h}`,
        density: m.density,
        perPage: m.sheets[0]?.perPage ?? null,
        sheet: m.sheets[0]?.sheet ?? null,
        grid: m.sheets[0]?.grid ?? null,
        pass: m.pass,
        notes: [...new Set(m.sheets.flatMap((s) => s.detail))].concat(m.sheets.some((s) => s.gridScroll) ? ["barra interna (+" + Math.max(...m.sheets.map((s) => s.gridScrollBy)) + "px)"] : [], m.sheets.some((s) => s.sheetCut) ? ["hoja cortada por el pie"] : [], reachable ? [] : ["sin hoja llena"]),
      };
      if (reported.has(key)) {
        // segunda pasada (reajuste en sentido contrario): solo se guarda si empeora
        const prev = rows.find((r) => r.state === state && r.size === row.size);
        if (prev && prev.pass && !row.pass) {
          prev.pass = false;
          prev.notes.push("falla al reajustar (en sentido inverso): " + row.notes.join("; "));
        }
        continue;
      }
      reported.add(key);
      rows.push(row);
      if (process.argv.includes("--verbose")) console.log(JSON.stringify(m.sheets));
      console.log(`${row.pass ? "OK  " : "FALLA"} ${state.padEnd(9)} ${row.size.padEnd(9)} nivel=${row.density ?? "-"} hoja=${row.perPage ?? "-"} sheet=${row.sheet?.join("x") ?? "-"} ${row.notes.join("; ")}`);
    }
    await ctx.close();
  }
}
await browser.close();

const failed = rows.filter((r) => !r.pass);
console.log(`\n${rows.length - failed.length}/${rows.length} combinaciones sin desborde.`);
const jsonOut = arg("json", "");
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(rows, null, 2));
process.exit(failed.length ? 1 : 0);
