/**
 * 성씨 정책 검증
 * - 실제 접수: 희귀·복성 포함 허용
 * - 가상 보충: 흔한 성씨만 가중치 생성
 *
 * Usage: npm run verify:surnames
 */

import {
  buildLiveFeed,
  createLocalSubmissionItem,
  formatReservationName,
  pickVirtualMinutes,
  VIRTUAL_MINUTE_GAP,
} from "../src/lib/live-reservation-feed";
import {
  ALLOWED_VIRTUAL_SURNAMES,
  FORBIDDEN_SURNAMES,
  pickWeightedKoreanSurnames,
} from "../src/lib/virtual-surnames";

let passed = 0;
let failed = 0;

function ok(label: string) {
  passed += 1;
  console.log(`  ✓ ${label}`);
}

function fail(label: string, detail?: string) {
  failed += 1;
  console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
}

function assertEqual(actual: unknown, expected: unknown, label: string) {
  if (actual === expected) ok(label);
  else fail(label, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function assertTrue(condition: boolean, label: string, detail?: string) {
  if (condition) ok(label);
  else fail(label, detail);
}

console.log("");
console.log("성씨 정책 검증");
console.log("");

console.log("→ 실제 접수 마스킹 (성씨 제한 없음)");
assertEqual(formatReservationName("김철수"), "김○○", "흔한 성씨");
assertEqual(formatReservationName("남궁민수"), "남궁○○", "복성 남궁");
assertEqual(formatReservationName("제갈공명"), "제갈○○", "복성 제갈");
assertEqual(formatReservationName("독고영재"), "독고○○", "복성 독고");

console.log("");
console.log("→ 실제 접수 아이템 (isVirtual=false)");
const rare = createLocalSubmissionItem("남궁민수");
assertTrue(rare.isVirtual === false, "희귀 성씨도 isVirtual=false");
assertEqual(rare.name, "남궁○○", "희귀 성씨 마스킹");

console.log("");
console.log("→ 실시간 피드 — 실제 접수 최상단 병합");
const feed = buildLiveFeed([], {
  maxCount: 5,
  virtualEnabled: true,
  dismissed: new Set(),
  stableVirtuals: new Map(),
  localPending: rare,
});
assertTrue(feed.length > 0, "피드에 항목 존재");
assertTrue(feed[0]?.isVirtual === false, "최상단은 실제 접수");
assertEqual(formatReservationName(feed[0]!.name), "남궁○○", "최상단 희귀 성씨 표기");

console.log("");
console.log("→ 가상 보충 — 희귀 성씨 미생성");
for (const forbidden of FORBIDDEN_SURNAMES) {
  assertTrue(
    !ALLOWED_VIRTUAL_SURNAMES.includes(forbidden),
    `가상 풀에 ${forbidden} 없음`
  );
}

const virtualBatch = pickWeightedKoreanSurnames(500);
const virtualForbidden = virtualBatch.filter((s) =>
  (FORBIDDEN_SURNAMES as readonly string[]).includes(s)
);
assertTrue(
  virtualForbidden.length === 0,
  "500회 가상 생성에 금지 성씨 0건",
  virtualForbidden.join(", ") || undefined
);

const virtualFeed = buildLiveFeed([], {
  maxCount: 10,
  virtualEnabled: true,
  dismissed: new Set(),
  stableVirtuals: new Map(),
});
const virtualOnlyForbidden = virtualFeed
  .filter((i) => i.isVirtual)
  .map((i) => formatReservationName(i.name))
  .filter((masked) =>
    (FORBIDDEN_SURNAMES as readonly string[]).some((f) => masked.startsWith(f))
  );
assertTrue(
  virtualOnlyForbidden.length === 0,
  "가상 피드에 금지 성씨 0건",
  virtualOnlyForbidden.join(", ") || undefined
);

console.log("");
console.log("→ 가상 카드 경과시간 — 최소 3분 간격");
const picked = pickVirtualMinutes(new Set(), 5);
const gapsOk = picked.every((m, i, arr) =>
  arr.every((other, j) => i === j || Math.abs(m - other) >= VIRTUAL_MINUTE_GAP)
);
assertTrue(gapsOk, `pickVirtualMinutes 간격 OK (${picked.join(", ")}분)`);

console.log("");
if (failed === 0) {
  console.log(`완료: ${passed}개 통과`);
  process.exit(0);
}

console.error(`실패: ${failed}건 / ${passed}개 통과`);
process.exit(1);
