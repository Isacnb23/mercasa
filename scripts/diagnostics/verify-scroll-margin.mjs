import { chromium } from "playwright";
import path from "node:path";

const OUT_DIR = process.argv[2] || ".";
const links = ["#inicio", "#nosotros", "#logistica", "#productos", "#contacto"];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });

const headerRect = await page.evaluate(() => {
  const h = document.querySelector("header");
  const r = h.getBoundingClientRect();
  return { top: r.top, bottom: r.bottom, height: r.height };
});
console.log("header rect (desktop):", JSON.stringify(headerRect));

for (const href of links) {
  await page.click(`nav a[href="${href}"]`);
  await page.waitForTimeout(1400); // lenis duration 0.9s + margin
  const sectionTop = await page.evaluate((h) => {
    const el = document.querySelector(h);
    return el.getBoundingClientRect().top;
  }, href);
  console.log(`${href}: section top after scroll = ${sectionTop}px (viewport)`);
  const file = path.join(OUT_DIR, `desktop_${href.slice(1)}.png`);
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 1440, height: 260 } });
  console.log(`  saved ${file}`);
}

await page.close();
await browser.close();
