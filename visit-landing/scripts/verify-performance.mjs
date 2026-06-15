#!/usr/bin/env node
/**
 * 성능 스모크 테스트 — API 응답·캐시 헤더·빌드 크기
 * Usage: node scripts/verify-performance.mjs [baseUrl]
 */

const baseUrl = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");

async function timedFetch(path, init) {
  const start = performance.now();
  const res = await fetch(`${baseUrl}${path}`, init);
  const ms = Math.round(performance.now() - start);
  const cacheControl = res.headers.get("cache-control") ?? "(none)";
  let bodyBytes = 0;
  try {
    const buf = await res.arrayBuffer();
    bodyBytes = buf.byteLength;
  } catch {
    /* ignore */
  }
  return { status: res.status, ms, cacheControl, bodyBytes };
}

async function main() {
  console.log("=== Performance smoke test ===");
  console.log(`Base URL: ${baseUrl}\n`);

  const siteContent1 = await timedFetch("/api/site-content?siteCode=L001");
  const siteContent2 = await timedFetch("/api/site-content?siteCode=L001");

  console.log("1. /api/site-content (1st request)");
  console.log(`   status=${siteContent1.status} time=${siteContent1.ms}ms size=${siteContent1.bodyBytes}B`);
  console.log(`   Cache-Control: ${siteContent1.cacheControl}`);

  console.log("\n2. /api/site-content (2nd request — server cache expected faster)");
  console.log(`   status=${siteContent2.status} time=${siteContent2.ms}ms size=${siteContent2.bodyBytes}B`);
  console.log(`   Cache-Control: ${siteContent2.cacheControl}`);

  const submit = await timedFetch("/api/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "perf-test", phone: "01000000000" }),
  });

  console.log("\n3. /api/submit (must NOT cache)");
  console.log(`   status=${submit.status} time=${submit.ms}ms`);
  console.log(`   Cache-Control: ${submit.cacheControl}`);

  console.log("\n--- Expected ---");
  console.log("site-content: public, s-maxage=60, stale-while-revalidate=300");
  console.log("submit:       no-store");
  console.log("2nd site-content should be faster with warm server cache\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
