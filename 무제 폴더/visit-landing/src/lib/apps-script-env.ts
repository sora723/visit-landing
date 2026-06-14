/** Apps Script 연결 env — Netlify/로컬 공통 */

import { resolveSiteCode } from "@/lib/resolve-site-code";

export type AppsScriptEnv = {
  url: string;
  siteCode: string;
  /** /macros/s/{id}/exec 의 deployment id */
  deploymentId: string | null;
};

export type AppsScriptEnvDebug = {
  appsScriptUrlConfigured: boolean;
  appsScriptUrlLength: number;
  deploymentId: string | null;
  siteCode: string;
  nodeEnv: string;
  netlify: boolean;
  vercel: boolean;
};

export function extractDeploymentId(url: string): string | null {
  const m = url.match(/\/macros\/s\/([^/]+)\/exec/i);
  return m?.[1] ?? null;
}

/** Netlify 빌드·런타임 — siteCodeOverride: URL ?siteCode= (우선) */
export function getAppsScriptEnv(siteCodeOverride?: string | null): AppsScriptEnv {
  const raw = process.env.APPS_SCRIPT_URL ?? "";
  const url = raw.replace(/\/$/, "");
  return {
    url,
    siteCode: resolveSiteCode(siteCodeOverride),
    deploymentId: url ? extractDeploymentId(url) : null,
  };
}

export function getAppsScriptEnvDebug(
  siteCodeOverride?: string | null
): AppsScriptEnvDebug {
  const { url, siteCode, deploymentId } = getAppsScriptEnv(siteCodeOverride);
  return {
    appsScriptUrlConfigured: url.length > 0,
    appsScriptUrlLength: url.length,
    deploymentId,
    siteCode,
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    netlify: Boolean(process.env.NETLIFY),
    vercel: Boolean(process.env.VERCEL),
  };
}

export function maskAppsScriptUrl(url: string): string {
  if (!url) return "(empty)";
  const id = extractDeploymentId(url);
  if (!id) return `(invalid url, length=${url.length})`;
  const head = id.slice(0, 8);
  const tail = id.slice(-6);
  return `https://script.google.com/macros/s/${head}…${tail}/exec`;
}

export function logAppsScriptEnv(
  tag: string,
  siteCodeOverride?: string | null
): AppsScriptEnvDebug {
  const env = getAppsScriptEnv(siteCodeOverride);
  const debug = getAppsScriptEnvDebug(siteCodeOverride);
  console.error(`[${tag}] APPS_SCRIPT_URL configured=${debug.appsScriptUrlConfigured} length=${debug.appsScriptUrlLength}`);
  if (env.url) {
    console.error(`[${tag}] APPS_SCRIPT_URL=${maskAppsScriptUrl(env.url)} deploymentId=${debug.deploymentId}`);
  } else {
    console.error(
      `[${tag}] APPS_SCRIPT_URL missing — Netlify: Site settings → Environment variables → APPS_SCRIPT_URL`
    );
  }
  console.error(
    `[${tag}] siteCode=${debug.siteCode} NODE_ENV=${debug.nodeEnv} NETLIFY=${debug.netlify}`
  );
  return debug;
}
