/**
 * UI 3차 — 모바일/PC 전체 + Hero/Live/CTA 캡처
 * Usage: node scripts/capture-v3-screenshots.mjs [baseUrl] [outDir]
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const baseUrl = process.argv[2] ?? "http://127.0.0.1:3003";
const outDir = process.argv[3] ?? path.join(root, "ui-review", "v3");

async function dismissPopup(page) {
  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  const close = page.locator('button[aria-label="닫기"]').first();
  if (await close.isVisible().catch(() => false)) {
    await close.click();
    await page.waitForTimeout(400);
  }
}

async function scrollFull(page) {
  await page.evaluate(async () => {
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
    const step = Math.max(window.innerHeight * 0.85, 400);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await delay(100);
    }
    window.scrollTo(0, 0);
    await delay(200);
  });
}

async function captureSection(page, selector, file) {
  const el = page.locator(selector).first();
  await el.waitFor({ state: "visible", timeout: 15000 });
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await el.screenshot({ path: path.join(outDir, file), type: "png" });
}

async function runDevice(name, contextOptions, prefix) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ ...contextOptions, locale: "ko-KR" });
  const page = await ctx.newPage();
  await dismissPopup(page);
  await scrollFull(page);

  await page.screenshot({
    path: path.join(outDir, `${prefix}-full.png`),
    type: "png",
    fullPage: true,
  });
  console.log(`✓ ${prefix}-full.png`);

  if (prefix === "mobile") {
    await page.evaluate(() => window.scrollTo(0, 0));
    await captureSection(page, "#hero", "mobile-hero.png");
    console.log("✓ mobile-hero.png");
    await captureSection(page, "#live-reservations", "mobile-live.png");
    console.log("✓ mobile-live.png");
    await captureSection(page, "#reservation", "mobile-cta.png");
    console.log("✓ mobile-cta.png");
  }

  await ctx.close();
  await browser.close();
}

async function main() {
  await mkdir(outDir, { recursive: true });
  console.log(`Capturing ${baseUrl} → ${outDir}`);

  await runDevice("mobile", devices["iPhone 15 Pro"], "mobile");
  await runDevice(
    "desktop",
    { viewport: { width: 1440, height: 900 } },
    "desktop"
  );

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
