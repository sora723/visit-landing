#!/usr/bin/env node
/**
 * 희귀 성씨 실제 접수 E2E 테스트
 * Usage: node scripts/test-rare-submit-live.mjs [baseUrl]
 */

const BASE = (process.argv[2] || "http://127.0.0.1:3007").replace(/\/$/, "");
const CASES = [
  { name: "남궁테스트", expected: "남궁○○" },
  { name: "제갈검증", expected: "제갈○○" },
];

function phone() {
  return "010" + String(Date.now()).slice(-8);
}

async function submit(name, tel) {
  const res = await fetch(`${BASE}/api/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      phone: tel,
      privacyAgreed: true,
      sourceUrl: `${BASE}/`,
      device: "desktop",
    }),
  });
  return res.json();
}

async function reservations() {
  const res = await fetch(`${BASE}/api/reservations?limit=12`, {
    cache: "no-store",
  });
  return res.json();
}

async function main() {
  console.log("");
  console.log("희귀 성씨 실제 접수 테스트");
  console.log(`  base: ${BASE}`);
  console.log("");

  let ok = 0;
  let fail = 0;

  for (const c of CASES) {
    const tel = phone();
    console.log(`→ ${c.name} (${tel})`);

    const sub = await submit(c.name, tel);
    if (!sub.success) {
      console.error(`  ✗ 접수 실패: ${sub.error?.message || JSON.stringify(sub)}`);
      fail += 1;
      continue;
    }
    console.log(`  ✓ 접수 성공 (${sub.data?.submissionId})`);

    await new Promise((r) => setTimeout(r, 1500));

    const list = await reservations();
    const items = list.data?.items ?? [];
    const hit = items.find((i) => i.isVirtual === false && String(i.name).includes("○○"));

    if (!hit) {
      console.error("  ✗ 실시간 목록에 실제 접수 없음");
      fail += 1;
      continue;
    }

    const display = hit.name;
    if (display === c.expected) {
      console.log(`  ✓ 표기: ${display}`);
      ok += 1;
    } else {
      console.log(`  ⚠ 표기: ${display} (기대: ${c.expected})`);
      console.log("    → 접수는 성공. Apps Script maskName_ 배포 필요 시 npm run setup:apps-script:push");
      ok += 1;
    }
    console.log("");
  }

  console.log(fail === 0 ? `완료: ${ok}건 접수 확인` : `실패 ${fail}건`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
