/**
 * 결정론적 실시간 피드 검증
 * Usage: npx --yes tsx scripts/verify-deterministic-feed.ts
 */

import {
  adjacentMinuteGaps,
  buildDeterministicLiveFeed,
  buildInitialFeedStack,
  FEED_BUCKET_MS,
  isSortedByRecency,
  VIRTUAL_GAP_MIN,
} from "../src/lib/deterministic-live-feed";
import {
  feedItemKey,
  prependToFeedStack,
} from "../src/lib/live-reservation-feed";

const siteCode = "L001";
const now = 1_700_000_000_000;
const dismissed = new Set<string>();

const feedA = buildDeterministicLiveFeed([], {
  siteCode,
  maxCount: 10,
  virtualEnabled: true,
  dismissed,
  now,
});

const feedB = buildDeterministicLiveFeed([], {
  siteCode,
  maxCount: 10,
  virtualEnabled: true,
  dismissed: new Set(),
  now,
});

let failed = 0;

function assertEqual(label: string, a: unknown, b: unknown) {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (ok) console.log(`  ✓ ${label}`);
  else {
    failed += 1;
    console.error(`  ✗ ${label}`);
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

assertEqual("동일 시각·siteCode → 동일 키", feedA.map(feedItemKey), feedB.map(feedItemKey));
assertEqual("가상 10건 채움", feedA.length, 10);
assertTrue("최신순 정렬", isSortedByRecency(feedA));

const gaps = adjacentMinuteGaps(feedA);
assertTrue(
  "인접 카드 간격 최소 1분",
  gaps.every((g) => g >= VIRTUAL_GAP_MIN),
  gaps.join(", ")
);
assertTrue(
  "가장 오래된 카드 20분",
  feedA[feedA.length - 1]?.minutesAgo === 20,
  String(feedA[feedA.length - 1]?.minutesAgo)
);

const stack = buildInitialFeedStack([], {
  siteCode,
  maxCount: 10,
  virtualEnabled: true,
  dismissed: new Set(),
  now,
});
assertTrue(
  "초기 스택 가장 오래된 카드 20분",
  stack[stack.length - 1]?.minutesAgo === 20,
  String(stack[stack.length - 1]?.minutesAgo)
);

const stack5 = buildDeterministicLiveFeed([], {
  siteCode,
  maxCount: 5,
  virtualEnabled: true,
  dismissed: new Set(),
  now,
});
const incoming = {
  name: "신규○○",
  minutesAgo: 0,
  isVirtual: true,
  type: "방문예약 신청",
  submittedAt: new Date().toISOString(),
  virtualSlotId: `${siteCode}:test:new`,
};
const pushed = prependToFeedStack(stack5, incoming, 5, new Set());
assertTrue("스택 prepend 후 최상단 신규", pushed[0]?.name === "신규○○");
assertEqual("스택 max 5 유지", pushed.length, 5);
assertTrue("스택 prepend 후 최신순", isSortedByRecency(pushed));

const nextBucket = now + FEED_BUCKET_MS + 1;
const feedNextBucket = buildDeterministicLiveFeed([], {
  siteCode,
  maxCount: 10,
  virtualEnabled: true,
  dismissed: new Set(),
  now: nextBucket,
});
if (feedA.map(feedItemKey).join(",") === feedNextBucket.map(feedItemKey).join(",")) {
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
