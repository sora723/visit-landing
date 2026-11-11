/**
 * Sheet-first BUSY wait 계약 검증 (서버/GAS 변경 없음).
 * node scripts/verify-submit-busy-wait.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const busySrc = readFileSync(join(root, "src/lib/submit-busy-wait.ts"), "utf8");
const apiSrc = readFileSync(join(root, "src/lib/api.ts"), "utf8");
const cfgSrc = readFileSync(join(root, "src/components/ConfigProvider.tsx"), "utf8");
const formSrc = readFileSync(
  join(root, "src/components/ReservationForm.tsx"),
  "utf8"
);

assert.match(busySrc, /BUSY_WAIT_MAX_MS = 10_000/);
assert.match(busySrc, /NETWORK_RETRY_DELAYS_MS = \[400, 800\]/);
assert.match(busySrc, /BUSY_WAIT_GAP_MS = \[600, 800, 1_000, 1_200\]/);
assert.match(busySrc, /savedToVerificationLog === true/);
assert.match(busySrc, /잠시 후 다시 시도/);
assert.match(apiSrc, /savedToVerificationLog/);
assert.match(apiSrc, /Blobs-only/);
assert.match(cfgSrc, /submitReservationWithBusyWait/);
assert.doesNotMatch(cfgSrc, /1회 재시도/);
assert.match(formSrc, /접수 중\.\.\./);
assert.doesNotMatch(formSrc, /처리 중\.\.\./);

console.log("verify-submit-busy-wait: ok");
