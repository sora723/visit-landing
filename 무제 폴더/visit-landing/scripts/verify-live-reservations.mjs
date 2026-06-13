/**
 * 실시간 방문예약 현황 — localhost 검증 + 캡처
 * Usage: node scripts/verify-live-reservations.mjs [baseUrl] [outDir]
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const baseUrl = process.argv[2] ?? "http://127.0.0.1:3006";
const outDir = process.argv[3] ?? path.join(root, "ui-review", "verify-live");

async function waitForStableFeed(page, expectedMobile = 5, timeoutMs = 8000) {
  const start = Date.now();
  let lastCount = -1;
  while (Date.now() - start < timeoutMs) {
    const data = await extractLiveSection(page);
    const count = data?.rowCount ?? 0;
    if (count === lastCount && count > 0) return data;
    lastCount = count;
    await page.waitForTimeout(500);
  }
  return extractLiveSection(page);
}

async function dismissPopup(page) {
  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  const close = page.locator('button[aria-label="닫기"]').first();
  if (await close.isVisible().catch(() => false)) {
    await close.click();
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(1200);
}

async function extractLiveSection(page) {
  return page.evaluate(() => {
    const section = document.getElementById("live-reservations");
    if (!section) return null;

    const rows = [...section.querySelectorAll("ul li")].map((li) => {
      const text = li.innerText.replace(/\s+/g, " ").trim();
      const badge = li.querySelector('[data-live-badge], .live-new-badge');
      const hasNewText = /\bNEW\b/i.test(text) || !!badge;
      const phoneMatch = text.match(/\d{3}[-.]?\d{3,4}[-.]?\d{4}/);
      const has접수완료 = text.includes("접수완료");
      const timeMatch = text.match(/(\d+분 전|방금 전)/);
      const namePart = text.split(/\d+분 전|방금 전/)[0]?.trim() ?? text;

      return {
        text,
        namePart,
        time: timeMatch?.[0] ?? null,
        hasNewBadge: hasNewText,
        hasPhone: !!phoneMatch,
        has접수완료,
      };
    });

    const headerText = section.innerText;
    const has성함Column = /성함/.test(headerText);
    const has시간Column = /시간/.test(headerText) && /성함/.test(headerText);
    const has번호Column = /번호/.test(headerText);

    return {
      rowCount: rows.length,
      rows,
      has성함Column,
      has시간Column,
      has번호Column,
      sectionHtml: section.innerHTML.slice(0, 500),
    };
  });
}

async function captureLive(page, file) {
  const el = page.locator("#live-reservations").first();
  await el.waitFor({ state: "visible", timeout: 15000 });
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await el.screenshot({ path: path.join(outDir, file), type: "png" });
}

async function fetchApiItems() {
  const res = await fetch(`${baseUrl}/api/reservations?limit=15`);
  const json = await res.json();
  return json.data?.items ?? [];
}

async function checkApiNoStale() {
  const items = await fetchApiItems();
  const stale = items.filter((i) => i.minutesAgo > 20);
  return { items, stale, pass: stale.length === 0 };
}

async function runMobileSubmissionTest(browser) {
  const ctx = await browser.newContext({
    ...devices["iPhone 13"],
    locale: "ko-KR",
  });
  const page = await ctx.newPage();
  await dismissPopup(page);

  const before = await waitForStableFeed(page);
  await captureLive(page, "08-before-submit-mobile.png");

  const uniqueName = `테스트${Date.now().toString().slice(-5)}`;
  const uniquePhone = `0109${Date.now().toString().slice(-7)}`;

  await page.locator("#reservation").scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.locator('#reservation input[type="text"]').first().fill(uniqueName);
  await page.locator('#reservation input[type="tel"]').fill(uniquePhone);
  await page.locator('#reservation input[type="checkbox"]').check();
  await page.locator('#reservation button[type="submit"]').click();
  await page.waitForTimeout(4000);

  if (page.url().includes("/complete")) {
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const close = page.locator('button[aria-label="닫기"]').first();
    if (await close.isVisible().catch(() => false)) await close.click();
    await page.waitForTimeout(2000);
  }

  const after = await waitForStableFeed(page);
  await captureLive(page, "09-after-submit-mobile.png");

  const maskedTop = `${uniqueName.trim().charAt(0)}○○`;

  await ctx.close();
  return { before, after, uniqueName, maskedTop };
}

async function main() {
  await mkdir(outDir, { recursive: true });
  console.log(`Verifying ${baseUrl} → ${outDir}`);

  const apiItems = await fetchApiItems();
  const apiCheck = await checkApiNoStale();
  const apiWithin20 = apiItems.filter((i) => i.minutesAgo <= 20);

  const browser = await chromium.launch({ headless: true });

  // Mobile
  const mobileCtx = await browser.newContext({
    ...devices["iPhone 13"],
    locale: "ko-KR",
  });
  const mobilePage = await mobileCtx.newPage();
  await dismissPopup(mobilePage);
  const mobileData = await waitForStableFeed(mobilePage);
  await captureLive(mobilePage, "01-mobile-live.png");
  await mobileCtx.close();

  // Desktop
  const desktopCtx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: "ko-KR",
  });
  const desktopPage = await desktopCtx.newPage();
  await dismissPopup(desktopPage);
  const desktopData = await waitForStableFeed(desktopPage, 10);
  await captureLive(desktopPage, "02-desktop-live.png");
  await desktopCtx.close();

  // Submission test
  let submitResult = null;
  try {
    submitResult = await runMobileSubmissionTest(browser);
  } catch (e) {
    submitResult = { error: String(e) };
  }

  await browser.close();

  const mobileMinutes = mobileData?.rows
    .map((r) => r.time)
    .filter(Boolean)
    .map((t) => (t === "방금 전" ? 0 : parseInt(t, 10)));

  const checks = {
    "1_성함_시간_구조": {
      pass:
        mobileData?.rows.every((r) => r.namePart && r.time) &&
        !mobileData?.has성함Column,
      note: mobileData?.has성함Column
        ? "테이블 헤더(성함|시간) 있음"
        : "카드형: 좌측 성함+문구 / 우측 시간",
      mobileRows: mobileData?.rows.map((r) => ({
        left: r.namePart,
        right: r.time,
      })),
    },
    "2_번호_컬럼_삭제": {
      pass: !mobileData?.has번호Column && !mobileData?.rows.some((r) => r.hasPhone),
      note: "번호 컬럼/연락처 노출 없음",
    },
    "3_NEW_배지_최상단만": {
      pass:
        mobileData?.rows.filter((r) => r.hasNewBadge).length === 1 &&
        mobileData?.rows[0]?.hasNewBadge === true,
      note: `NEW 배지 ${mobileData?.rows.filter((r) => r.hasNewBadge).length ?? 0}개 (첫행: ${mobileData?.rows[0]?.hasNewBadge ?? false})`,
    },
    "4_접수완료_제거": {
      pass: !mobileData?.rows.some((r) => r.has접수완료),
      note: "접수완료 텍스트 없음",
    },
    "5_최근_20분_만": {
      pass:
        (mobileMinutes?.every((m) => m <= 20) ?? false) && apiCheck.pass,
      note: `UI: ${mobileMinutes?.join(", ")} / API 20분초과 ${apiCheck.stale.length}건`,
    },
    "6_모바일_5건": {
      pass: mobileData?.rowCount === 5,
      note: `모바일 ${mobileData?.rowCount}건`,
    },
    "7_PC_10건": {
      pass: desktopData?.rowCount === 10,
      note: `PC ${desktopData?.rowCount}건`,
    },
    "8_신규_접수_맨위": {
      pass:
        submitResult?.after?.rows?.[0]?.namePart?.startsWith(
          submitResult?.maskedTop ?? "§"
        ) ?? false,
      note:
        submitResult?.error ??
        `접수명 ${submitResult?.uniqueName} → 마스킹 ${submitResult?.maskedTop}, 1행: ${submitResult?.after?.rows?.[0]?.namePart}`,
    },
    "9_기존_아래로": {
      pass:
        submitResult?.before?.rows?.[0]?.text &&
        submitResult?.after?.rows?.[1]?.text === submitResult?.before?.rows?.[0]?.text,
      note: `접수 전 1행: ${submitResult?.before?.rows?.[0]?.text?.slice(0, 35)} / 접수 후 2행: ${submitResult?.after?.rows?.[1]?.text?.slice(0, 35)}`,
    },
  };

  const report = {
    baseUrl,
    capturedAt: new Date().toISOString(),
    checks,
    mobileData,
    desktopData,
    apiCheck,
    apiWithin20Count: apiWithin20.length,
  };

  await writeFile(
    path.join(outDir, "report.json"),
    JSON.stringify(report, null, 2),
    "utf8"
  );

  console.log("\n=== 검증 결과 ===");
  for (const [key, val] of Object.entries(checks)) {
    console.log(`${val.pass ? "✅" : "❌"} ${key}: ${val.note}`);
  }
  console.log(`\n캡처: ${outDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
