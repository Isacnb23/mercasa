import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
const ids = ["nosotros", "logistica", "productos", "contacto", "marcas", "colaboradores"];
for (const id of ids) {
  const val = await page.evaluate((id) => {
    const el = document.getElementById(id);
    if (!el) return "NOT FOUND";
    return getComputedStyle(el).scrollMarginTop;
  }, id);
  console.log(`#${id} scroll-margin-top = ${val}`);
}
await browser.close();
