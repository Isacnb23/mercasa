import { chromium } from "playwright";

const SEGMENT_KEYS = [
  "supermercados",
  "hoteleria",
  "restaurantes",
  "comercio-local",
  "panaderias",
  "instituciones",
  "retail",
];

async function measure(width, locale = "") {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height: 1400 } });
  await page.goto(`http://localhost:3000${locale}/#contacto`, { waitUntil: "load" });
  await page.waitForTimeout(4000);
  await page.evaluate(() => document.querySelector("#contacto")?.scrollIntoView());
  await page.waitForTimeout(800);

  const results = {};
  for (const key of SEGMENT_KEYS) {
    const idx = SEGMENT_KEYS.indexOf(key);
    const buttons = await page.$$('#contacto button[aria-pressed]');
    await buttons[idx].click();
    await page.waitForTimeout(500); // dejar terminar la transición de framer-motion
    const box = await page.evaluate(() => {
      const btn = document.querySelector('#contacto button[aria-pressed]');
      let el = btn;
      while (el && !(el.className && el.className.includes && el.className.includes('rounded-[28px]'))) {
        el = el.parentElement;
      }
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { width: r.width, height: r.height };
    });
    results[key] = box;
  }
  await page.close();
  await browser.close();
  return results;
}

(async () => {
  for (const w of [320, 375, 430, 640, 768, 1024, 1280, 1440]) {
    console.log(`=== es ${w} ===`);
    const r = await measure(w);
    const heights = Object.values(r).map((v) => v?.height ?? 0);
    console.log(JSON.stringify(r));
    console.log("max height:", Math.max(...heights));
  }
  for (const w of [320, 375, 640, 768, 1024, 1440]) {
    console.log(`=== en ${w} ===`);
    const r = await measure(w, "/en");
    const heights = Object.values(r).map((v) => v?.height ?? 0);
    console.log(JSON.stringify(r));
    console.log("max height:", Math.max(...heights));
  }
})();
