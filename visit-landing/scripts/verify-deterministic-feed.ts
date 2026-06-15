/**
 * 결정론적 실시간 피드 검증 — 기기·새로고침·최신순·간격
 * Usage: npx --yes tsx scripts/verify-deterministic-feed.ts
 */

import {
  adjacentMinuteGaps,
  buildDeterministicLiveFeed,
  FEED_BUCKET_MS,
  isSortedByRecency,
  VIRTUAL_GAP_MAX,
  VIRTUAL_GAP_MIN,
} from "../src/lib/deterministic-live-feed";
import { feedItemKey } from "../src/lib/live-reservation-feed";

const siteCode = "L001";
const now = 1_700_000_000_000;

const feedA = buildDeterministicLiveFeed([], {
  siteCode,
  maxCount: 10,
  virtualEnabled: true,
  dismissed: new Set(),
  now,
});

const feedB = buildDeterministicLiveFeed([], {
  siteCode,
  maxCount: 10,
  virtualEnabled: true,
  dismissed: new Set(),
  now,
});

const keysA = feedA.map(feedItemKey);
const keysB = feedB.map(feedItemKey);

let failed = 0;

function assertEqual(label: string, a: unknown, b: unknown) {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (ok) console.log(`  ✓ ${label}`);
  else {
    failed += 1;
    console.error(`  ✗ ${label}`);
    console.error(`    A: ${JSON.stringify(a)}`);
    console.error(`    B: ${JSON.stringify(b)}`);
  }
}

function assertTrue(label: string, condition: boolean, detail?: string) {
  if (condition) console.log(`  ✓ ${label}`);
  else {
    failed += 1;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("");
console.log("결정론적 실시간 피드 검증");
console.log("");

assertEqual("동일 시각·siteCode → 동일 키", keysA, keysB);
assertEqual("가상 10건 채움", feedA.length, 10);
assertEqual("모바일·PC 공통 상위 5건", keysA.slice(0, 5), keysB.slice(0, 5));
assertTrue("최신순 정렬", isSortedByRecency(feedA), feedA.map((i) => i.minutesAgo).join(", "));

const gaps = adjacentMinuteGaps(feedA);
assertTrue(
  "인접 카드 간격 1~10분",
  gaps.every((g) => g >= VIRTUAL_GAP_MIN && g <= VIRTUAL_GAP_MAX),
  gaps.join(", ")
);

const later = now + 60_000;
const feedLater = buildDeterministicLiveFeed([], {
  siteCode,
  maxCount: 10,
  virtualEnabled: true,
  dismissed: new Set(),
  now: later,
});
const sharedKeys = keysA.filter((k) => feedLater.map(feedItemKey).includes(k));
assertTrue("1분 후에도 기존 항목 대부분 유지", sharedKeys.length >= 8);

const otherDevice = buildDeterministicLiveFeed([], {
  siteCode,
  maxCount: 10,
  virtualEnabled: true,
  dismissed: new Set(),
  now,
});
assertEqual(
  "다른 클라이언트 시뮬레이션 — 목록 일치",
  otherDevice.map((i) => i.name),
  feedA.map((i) => i.name)
);

const nextBucket = now + FEED_BUCKET_MS + 1;
const feedNextBucket = buildDeterministicLiveFeed([], {
  siteCode,
  maxCount: 10,
  virtualEnabled: true,
  dismissed: new Set(),
  now: nextBucket,
});
const sameBucketAgain = keysA.join(",") === feedNextBucket.map(feedItemKey).join(",");
if (sameBucketAgain) {
  failed += 1;
  console.error("  ✗ 30분 버킷 전환 시 목록 갱신됨 (기대)");
} else {
  console.log("  ✓ 30분 버킷 전환 시 목록 갱신");
}

console.log("");
if (failed > 0) {
  console.error(`FAILED (${failed})`);
  process.exit(1);
}
console.log("ALL PASSED");
console.log("");
