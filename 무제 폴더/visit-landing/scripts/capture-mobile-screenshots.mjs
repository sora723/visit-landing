/**
 * iPhone 15 Pro 기준 모바일 섹션 캡처
 * Usage: node scripts/capture-mobile-screenshots.mjs [baseUrl] [outDir]
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const baseUrl = process.argv[2] ?? "http://127.0.0.1:3001";
const outDir =
  process.argv[3] ?? path.join(root, "ui-review", "mobile");

const captures = [
  { file: "mobile-01-hero.png", selector: "main > section:nth-of-type(1)" },
  { file: "mobile-02-live.png", selector: "main > section:nth-of-type(2)" },
  { file: "mobile-03-guide.png", selector: "main > section:nth-of-type(3)" },
  { file: "mobile-04-overview.png", selector: "main > section:nth-of-type(4)" },
  { file: "mobile-05-premium.png", selector: "main > section:nth-of-type(5)" },
  { file: "mobile-06-location.png", selector: "main > section:nth-of-type(6)" },
  { file: "mobile-07-future.png", selector: "#future" },
  { file: "mobile-08-layout.png", selector: "#layout" },
  { file: "mobile-09-community.png", selector: "#community" },
  { file: "mobile-10-cta.png", selector: "#cta-reservation" },
  {
    file: "mobile-11-mobilebar.png",
    selector: "#cta-reservation",
    focusBar: true,
  },
];

async function waitForPage(page) {
  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);

  const popupClose = page.locator('button[aria-label="닫기"], button:has-text("×")').first();
  if (await popupClose.isVisible().catch(() => false)) {
    await popupClose.click();
    await page.waitForTimeout(400);
  }
}

async function captureSection(page, { selector, focusBar }) {
  const el = page.locator(selector).first();
  await el.waitFor({ state: "visible", timeout: 15000 });
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);

  if (focusBar) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    return { mode: "viewport" };
  }

  return { mode: "element", el };
}

async function main() {
  await mkdir(outDir, { recursive: true });

  const device = devices["iPhone 15 Pro"];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...device,
    locale: "ko-KR",
  });
  const page = await context.newPage();

  console.log(`Capturing ${baseUrl} → ${outDir}`);
  await waitForPage(page);

  for (const cap of captures) {
    const outPath = path.join(outDir, cap.file);
    if (cap.file.includes("hero")) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);
    }
    const result = await captureSection(page, cap);

    if (result.mode === "viewport") {
      await page.screenshot({ path: outPath, type: "png", fullPage: false });
    } else {
      await result.el.screenshot({ path: outPath, type: "png" });
    }
    console.log(`✓ ${cap.file}`);
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(outDir, "mobile-full.png"),
    type: "png",
    fullPage: true,
  });
  console.log("✓ mobile-full.png");

  await browser.close();
  console.log(`Done. ${captures.length + 1} files saved.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
