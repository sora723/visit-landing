/**
 * form-token HMAC 계약 스모크 — mint/verify + 재사용 거부 로직(단위).
 * 실행: npx --yes tsx scripts/verify-form-token.ts
 */
import assert from "node:assert/strict";
import {
  FORM_TOKEN_TTL_SECONDS,
  mintFormToken,
  verifyFormToken,
} from "../src/lib/form-token";

const secret = "test-form-token-hmac-secret-32chars!!";
const site = "L010";

const minted = mintFormToken(site, secret);
assert.ok(minted, "mint");
assert.equal(minted.expiresIn, FORM_TOKEN_TTL_SECONDS);

const ok = verifyFormToken(minted.formToken, secret, site);
assert.equal(ok.ok, true, "verify ok");

const badSite = verifyFormToken(minted.formToken, secret, "L999");
assert.equal(badSite.ok, false, "site mismatch");

const badSecret = verifyFormToken(minted.formToken, secret + "x", site);
assert.equal(badSecret.ok, false, "bad secret");

const expired = mintFormToken(site, secret, {
  nowSeconds: Math.floor(Date.now() / 1000) - 700,
  ttlSeconds: 600,
});
assert.ok(expired);
const expiredCheck = verifyFormToken(expired.formToken, secret, site);
assert.equal(expiredCheck.ok, false, "expired");

console.log("verify-form-token: OK");
