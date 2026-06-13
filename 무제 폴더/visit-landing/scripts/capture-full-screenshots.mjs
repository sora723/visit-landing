/**
 * 모바일 / PC 전체 페이지 캡처
 * Usage: node scripts/capture-full-screenshots.mjs [baseUrl] [outDir]
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const baseUrl = process.argv[2] ?? "http://127.0.0.1:3002";
const outDir = process.argv[3] ?? path.join(root, "ui-review");

async function scrollFullPage(page) {
  await page.evaluate(async () => {
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
    const step = Math.max(window.innerHeight * 0.8, 400);
    let y = 0;
    const max = document.body.scrollHeight;
    while (y < max) {
      window.scrollTo(0, y);
      await delay(120);
      y += step;
    }
    window.scrollTo(0, 0);
    await delay(200);
  });
}

async function dismissPopup(page) {
  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  const popupClose = page
    .locator('button[aria-label="닫기"], button:has-text("×")')
    .first();
  if (await popupClose.isVisible().catch(() => false)) {
    await popupClose.click();
    await page.waitForTimeout(400);
  }
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  const mobile = await browser.newContext({
    ...devices["iPhone 15 Pro"],
    locale: "ko-KR",
  });
  const mobilePage = await mobile.newPage();
  console.log(`Mobile capture: ${baseUrl}`);
  await dismissPopup(mobilePage);
  await scrollFullPage(mobilePage);
  await mobilePage.waitForTimeout(300);
  await mobilePage.screenshot({
    path: path.join(outDir, "mobile-full.png"),
    type: "png",
    fullPage: true,
  });
  console.log("✓ mobile-full.png");
  await mobile.close();

  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "ko-KR",
  });
  const desktopPage = await desktop.newPage();
  console.log(`Desktop capture: ${baseUrl}`);
  await dismissPopup(desktopPage);
  await scrollFullPage(desktopPage);
  await desktopPage.waitForTimeout(300);
  await desktopPage.screenshot({
    path: path.join(outDir, "desktop-full.png"),
    type: "png",
    fullPage: true,
  });
  console.log("✓ desktop-full.png");
  await desktop.close();

  await browser.close();
  console.log(`Done → ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
