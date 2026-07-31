/**
 * Preview cookie → 서버 재검증 세션.
 * secret / 검증 로직은 서버 전용.
 */

import "server-only";

import { cookies } from "next/headers";
import {
  V2_PREVIEW_COOKIE_NAME,
  verifyV2PreviewToken,
  type V2PreviewTokenPayload,
} from "@/v2/preview/v2-preview-token";

export type V2PreviewSession = {
  siteCode: string;
  draftRevisionId: string;
  expiresAt: number;
  /** cookie에 저장된 서명 토큰 — Apps Script draft read에만 서버 전달 */
  token: string;
  payload: V2PreviewTokenPayload;
};

function getPreviewHmacSecret(): string {
  return String(process.env.V2_PREVIEW_HMAC_SECRET ?? "").trim();
}

/**
 * 현재 요청 siteCode와 cookie 세션이 일치할 때만 반환.
 * 만료·변조·siteCode 불일치·secret 없음 → null (공개 흐름 유지 않음).
 */
export async function readV2PreviewSession(
  currentSiteCode: string
): Promise<V2PreviewSession | null> {
  const siteCode = String(currentSiteCode ?? "").trim();
  if (!siteCode) return null;

  const secret = getPreviewHmacSecret();
  if (!secret) return null;

  const jar = await cookies();
  const token = jar.get(V2_PREVIEW_COOKIE_NAME)?.value;
  if (!token) return null;

  const verified = verifyV2PreviewToken(token, secret, {
    expectedSiteCode: siteCode,
  });
  if (!verified.ok) return null;

  return {
    siteCode: verified.payload.siteCode,
    draftRevisionId: verified.payload.draftRevisionId,
    expiresAt: verified.payload.expiresAt,
    token,
    payload: verified.payload,
  };
}

/** generateMetadata 등 — 세션 존재만 확인 (동일 규칙) */
export async function hasValidV2PreviewSession(
  currentSiteCode: string
): Promise<boolean> {
  return (await readV2PreviewSession(currentSiteCode)) != null;
}
