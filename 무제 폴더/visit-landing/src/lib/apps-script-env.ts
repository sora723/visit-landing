/** Apps Script 연결 env — Netlify/로컬 공통 */

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

/** Netlify 빌드·런타임 공통 env 읽기 (요청마다 호출) */
export function getAppsScriptEnv(): AppsScriptEnv {
  const raw = process.env.APPS_SCRIPT_URL ?? "";
  const url = raw.replace(/\/$/, "");
  return {
    url,
    siteCode: process.env.SHEET_SITE_CODE ?? "L001",
    deploymentId: url ? extractDeploymentId(url) : null,
  };
}

export function getAppsScriptEnvDebug(): AppsScriptEnvDebug {
  const { url, siteCode, deploymentId } = getAppsScriptEnv();
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

export function logAppsScriptEnv(tag: string): AppsScriptEnvDebug {
  const env = getAppsScriptEnv();
  const debug = getAppsScriptEnvDebug();
  console.error(`[${tag}] APPS_SCRIPT_URL configured=${debug.appsScriptUrlConfigured} length=${debug.appsScriptUrlLength}`);
  if (env.url) {
    console.error(`[${tag}] APPS_SCRIPT_URL=${maskAppsScriptUrl(env.url)} deploymentId=${debug.deploymentId}`);
  } else {
    console.error(
      `[${tag}] APPS_SCRIPT_URL missing — Netlify: Site settings → Environment variables → APPS_SCRIPT_URL`
    );
  }
  console.error(
    `[${tag}] SHEET_SITE_CODE=${debug.siteCode} NODE_ENV=${debug.nodeEnv} NETLIFY=${debug.netlify}`
  );
  return debug;
}
