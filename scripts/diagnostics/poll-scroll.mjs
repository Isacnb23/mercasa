import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });

await page.click('nav a[href="#nosotros"]');
for (let i = 0; i < 20; i++) {
  await page.waitForTimeout(150);
  const info = await page.evaluate(() => {
    const el = document.getElementById("nosotros");
    return { scrollY: window.scrollY, sectionTop: el.getBoundingClientRect().top };
  });
  console.log(`t=${i*150}ms scrollY=${info.scrollY.toFixed(1)} sectionTop=${info.sectionTop.toFixed(1)}`);
}
await browser.close();
