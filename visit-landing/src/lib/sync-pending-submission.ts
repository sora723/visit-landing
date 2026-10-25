/**
 * 임시 원장 → Apps Script(_검증로그 / postProcess) 동기화 + 재시도
 */

import {
  deletePendingSubmission,
  listPendingSubmissions,
  type PendingSubmissionRecord,
  updatePendingSubmission,
} from "@/lib/pending-submission-store";

const APPS_SCRIPT_SUBMIT_TIMEOUT_MS = 15_000;
const APPS_SCRIPT_POST_PROCESS_TIMEOUT_MS = 25_000;
const APPS_SCRIPT_FLUSH_TIMEOUT_MS = 45_000;
const PENDING_FLUSH_LIMIT = 5;
const SYNC_ATTEMPTS = 3;
const MAX_RECORD_ATTEMPTS = 8;

function getAppsScriptUrl() {
  return process.env.APPS_SCRIPT_URL?.replace(/\/$/, "") ?? "";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postAppsScriptAction(
  appsScriptUrl: string,
  body: Record<string, unknown>,
  timeoutMs: number
) {
  return fetch(appsScriptUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
}

async function gasSubmitOnce(
  appsScriptUrl: string,
  record: PendingSubmissionRecord
): Promise<{ ok: boolean; needsPostProcess: boolean; error?: string }> {
  try {
    const res = await postAppsScriptAction(
      appsScriptUrl,
      {
        ...record.payload,
        action: "submit",
        submissionId: record.submissionId,
        submittedAt: record.submittedAt,
      },
      APPS_SCRIPT_SUBMIT_TIMEOUT_MS
    );
    const json = (await res.json()) as {
      success?: boolean;
      data?: {
        savedToVerificationLog?: boolean;
        needsPostProcess?: boolean;
      };
      error?: { message?: string };
    };
    const ok =
      json?.success === true && json?.data?.savedToVerificationLog === true;
    if (!ok) {
      return {
        ok: false,
        needsPostProcess: record.needsPostProcess,
        error: json?.error?.message || "GAS submit did not log",
      };
    }
    return {
      ok: true,
      needsPostProcess:
        json?.data?.needsPostProcess === false
          ? false
          : record.needsPostProcess,
    };
  } catch (err) {
    return {
      ok: false,
      needsPostProcess: record.needsPostProcess,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function gasPostProcessOnce(
  appsScriptUrl: string,
  record: PendingSubmissionRecord
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await postAppsScriptAction(
      appsScriptUrl,
      {
        ...record.payload,
        action: "submit.postProcess",
        submissionId: record.submissionId,
        submittedAt: record.submittedAt,
      },
      APPS_SCRIPT_POST_PROCESS_TIMEOUT_MS
    );
    const json = (await res.json()) as {
      success?: boolean;
      error?: { message?: string };
    };
    if (json?.success !== true) {
      return {
        ok: false,
        error: json?.error?.message || "GAS postProcess failed",
      };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** 단건 동기화 — 시트 저장 우선, postProcess는 best-effort */
export async function syncPendingSubmissionRecord(
  record: PendingSubmissionRecord
): Promise<{ synced: boolean; error?: string }> {
  const appsScriptUrl = getAppsScriptUrl();
  if (!appsScriptUrl) {
    return { synced: false, error: "APPS_SCRIPT_URL empty" };
  }

  let working = record;
  let needsPostProcess = record.needsPostProcess;

  if (working.status === "pending") {
    let lastError = "";
    let logged = false;
    for (let i = 0; i < SYNC_ATTEMPTS; i++) {
      const result = await gasSubmitOnce(appsScriptUrl, working);
      if (result.ok) {
        logged = true;
        needsPostProcess = result.needsPostProcess;
        break;
      }
      lastError = result.error || "submit failed";
      await updatePendingSubmission(working.submissionId, {
        attempts: (working.attempts || 0) + 1,
        lastError,
      });
      working = {
        ...working,
        attempts: (working.attempts || 0) + 1,
        lastError,
      };
      if (i < SYNC_ATTEMPTS - 1) await sleep(400 * (i + 1));
    }

    if (!logged) {
      const attempts = (working.attempts || 0) + 1;
      await updatePendingSubmission(working.submissionId, {
        attempts,
        lastError,
        status: attempts >= MAX_RECORD_ATTEMPTS ? "failed" : "pending",
      });
      console.error(
        "[sync-pending] GAS submit failed",
        working.submissionId,
        lastError
      );
      return { synced: false, error: lastError };
    }

    await updatePendingSubmission(working.submissionId, {
      status: "sheet_logged",
      lastError: undefined,
    });
    working = { ...working, status: "sheet_logged" };
  }

  if (working.status === "sheet_logged" && needsPostProcess) {
    const post = await gasPostProcessOnce(appsScriptUrl, working);
    if (!post.ok) {
      await updatePendingSubmission(working.submissionId, {
        lastError: post.error,
      });
      console.error(
        "[sync-pending] postProcess failed (sheet kept)",
        working.submissionId,
        post.error
      );
      // 검증로그는 남았으므로 원장 유지 — warm이 재시도
      return { synced: true, error: post.error };
    }
  }

  try {
    await postAppsScriptAction(
      appsScriptUrl,
      { action: "notify.flush", limit: PENDING_FLUSH_LIMIT },
      APPS_SCRIPT_FLUSH_TIMEOUT_MS
    );
  } catch (err) {
    console.error("[sync-pending] notify.flush failed", err);
  }

  await deletePendingSubmission(working.submissionId);
  return { synced: true };
}

/** after / warm 에서 미동기화 건 처리 */
export async function flushPendingSubmissions(limit = 5): Promise<{
  processed: number;
  synced: number;
  failed: number;
}> {
  const rows = await listPendingSubmissions(limit);
  let synced = 0;
  let failed = 0;
  for (const row of rows) {
    if (row.status === "failed") continue;
    const result = await syncPendingSubmissionRecord(row);
    if (result.synced) synced++;
    else failed++;
  }
  return { processed: rows.length, synced, failed };
}
