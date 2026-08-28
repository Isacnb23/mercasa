import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch();

  // Desktop
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });
    await page.goto("http://localhost:3000/#contacto", { waitUntil: "load" });
    await page.waitForTimeout(5000); // dejar terminar el splash/loader inicial del sitio
    await page.evaluate(() => document.querySelector("#contacto")?.scrollIntoView());
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "scripts/diagnostics/out-contacto-desktop.png", fullPage: false });

    // Esperar a que el mapa cargue tiles reales (worker + tiles vectoriales
    // tardan más de los 6s del fail-safe en un chromium headless en frío).
    await page.waitForTimeout(10000);
    await page.screenshot({ path: "scripts/diagnostics/out-mapa-desktop.png", fullPage: false });
    await page.close();
  }

  // Mobile: viewport real (no fullPage, que ignora el scroll y siempre
  // arranca desde el tope de la página).
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto("http://localhost:3000/#contacto", { waitUntil: "load" });
    await page.waitForTimeout(5000);
    await page.evaluate(() => document.querySelector("#contacto")?.scrollIntoView());
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "scripts/diagnostics/out-contacto-mobile-1.png", fullPage: false });
    await page.evaluate(() => window.scrollBy(0, 700));
    await page.waitForTimeout(10000); // tiempo para que el mapa entre en viewport y cargue tiles
    await page.screenshot({ path: "scripts/diagnostics/out-contacto-mobile-2.png", fullPage: false });
    await page.evaluate(() => window.scrollBy(0, 700));
    await page.waitForTimeout(500);
    await page.screenshot({ path: "scripts/diagnostics/out-contacto-mobile-3.png", fullPage: false });
    await page.close();
  }

  await browser.close();
})();
