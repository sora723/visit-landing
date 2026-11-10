/**
 * GAS 시스템로그에 한 줄 남김 (fire-and-forget).
 * siteCode 를 반드시 넣어 현장 혼선을 막는다.
 */

function getAppsScriptUrl(): string {
  return process.env.APPS_SCRIPT_URL?.replace(/\/$/, "") ?? "";
}

export async function appendSystemLog(opts: {
  siteCode: string;
  logAction: string;
  message: string;
}): Promise<boolean> {
  const appsScriptUrl = getAppsScriptUrl();
  if (!appsScriptUrl) return false;
  const siteCode = String(opts.siteCode || "").trim();
  try {
    const res = await fetch(appsScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "ops.log",
        siteCode,
        logAction: opts.logAction,
        message: opts.message,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    const json = (await res.json()) as { success?: boolean };
    return json?.success === true;
  } catch (err) {
    console.error(
      "[ops-system-log] append failed",
      siteCode,
      err instanceof Error ? err.message : err
    );
    return false;
  }
}
