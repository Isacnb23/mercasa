import { chromium } from "playwright";
import path from "node:path";

const OUT_DIR = process.argv[2] || ".";
const browser = await chromium.launch();

// 1. Desktop navbar — full width, check item order + spacing
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(OUT_DIR, "navbar_desktop_1440.png"), clip: { x: 0, y: 0, width: 1440, height: 110 } });

  // Click "Customer Class" link and confirm scroll + active state
  const links = await page.$$eval("nav a", (as) => as.map((a) => ({ href: a.getAttribute("href"), text: a.textContent })));
  console.log("desktop nav links:", JSON.stringify(links));

  await page.click('nav a[href="#customer-class"]');
  await page.waitForTimeout(1400);
  const info = await page.evaluate(() => {
    const el = document.getElementById("customer-class");
    return el ? el.getBoundingClientRect().top : null;
  });
  console.log("customer-class section top after click:", info);
  await page.screenshot({ path: path.join(OUT_DIR, "navbar_after_click_customerclass.png"), clip: { x: 0, y: 0, width: 1440, height: 260 } });

  const activeClass = await page.$eval('nav a[href="#customer-class"]', (a) => a.className);
  console.log("customer-class link className after click:", activeClass);

  await page.close();
}

// 2. Widths around the new lg (1024px) breakpoint — hamburger below, horizontal nav above
for (const width of [768, 1023, 1024, 1280]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000); // splash/loader animation
  await page.screenshot({ path: path.join(OUT_DIR, `navbar_${width}.png`), clip: { x: 0, y: 0, width, height: 110 } });
  await page.close();
}

// 4. Mobile hamburger menu
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.click('button[aria-label]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT_DIR, "navbar_mobile_menu.png"), clip: { x: 0, y: 0, width: 390, height: 500 } });
  const mobileLinks = await page.$$eval("a.rounded-2xl", (as) => as.map((a) => ({ href: a.getAttribute("href"), text: a.textContent })));
  console.log("mobile menu links:", JSON.stringify(mobileLinks));
  await page.close();
}

await browser.close();
