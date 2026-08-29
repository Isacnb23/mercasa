import { chromium } from "playwright";

const viewports = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

const browser = await chromium.launch();
for (const [name, viewport] of Object.entries(viewports)) {
  const page = await browser.newPage({ viewport });
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  const height = await page.evaluate(() => {
    const header = document.querySelector("header");
    return header ? header.getBoundingClientRect().height : null;
  });
  console.log(`${name} (${viewport.width}x${viewport.height}): header height = ${height}px`);
  await page.close();
}
await browser.close();
