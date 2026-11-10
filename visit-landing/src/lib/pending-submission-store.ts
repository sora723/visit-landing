/**
 * BUSY/순간실패 임시 원장 — 완료 UI 없음.
 * Netlify Blobs(강일관성) 우선, 로컬/미구성 시 .data 폴백.
 *
 * awaiting_sheet: _검증로그 전. warm/ops 가 Blobs payload 그대로 →검증로그→postProcess.
 * (실접수 formToken·필드 포함 재전송. 토큰 우회 없음.)
 * sheet_logged: 검증로그까지 간 옛 잔여(무조건 삭제 금지 — 미접수일 때만 정리).
 * 키는 submissionId. payload.siteCode 로 현장 격리.
 */

import { mkdir, readdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

export type PendingSubmissionStatus =
  | "awaiting_sheet"
  | "pending"
  | "sheet_logged"
  | "done"
  | "failed";

export type PendingSubmissionRecord = {
  submissionId: string;
  siteCode: string;
  submittedAt: string;
  needsPostProcess: boolean;
  payload: Record<string, unknown>;
  status: PendingSubmissionStatus;
  attempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};

const STORE_NAME = "visit-pending-submissions";
const FS_DIR = path.join(process.cwd(), ".data", "pending-submissions");
const MAX_LIST = 80;

type BlobStoreLike = {
  get: (
    key: string,
    opts: { type: "json" }
  ) => Promise<PendingSubmissionRecord | null>;
  setJSON: (key: string, value: PendingSubmissionRecord) => Promise<void>;
  delete: (key: string) => Promise<void>;
  list: () => Promise<{ blobs: Array<{ key: string }> }>;
};

function canUseNetlifyBlobs(): boolean {
  return Boolean(
    process.env.NETLIFY ||
      process.env.NETLIFY_BLOBS_CONTEXT ||
      process.env.BLOBS_CONTEXT
  );
}

async function getBlobStore(): Promise<BlobStoreLike | null> {
  if (!canUseNetlifyBlobs()) return null;
  try {
    const { getStore } = await import("@netlify/blobs");
    return getStore({
      name: STORE_NAME,
      consistency: "strong",
    }) as unknown as BlobStoreLike;
  } catch (err) {
    console.warn(
      "[pending-submission-store] Netlify Blobs unavailable, using fs fallback",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

async function ensureFsDir() {
  await mkdir(FS_DIR, { recursive: true });
}

function fsPath(id: string) {
  return path.join(FS_DIR, `${id}.json`);
}

export async function savePendingSubmission(
  record: PendingSubmissionRecord
): Promise<void> {
  const store = await getBlobStore();
  if (store) {
    await store.setJSON(record.submissionId, record);
    return;
  }
  await ensureFsDir();
  await writeFile(fsPath(record.submissionId), JSON.stringify(record), "utf8");
}

export async function getPendingSubmission(
  submissionId: string
): Promise<PendingSubmissionRecord | null> {
  const store = await getBlobStore();
  if (store) {
    const row = await store.get(submissionId, { type: "json" });
    return row ?? null;
  }
  try {
    const raw = await readFile(fsPath(submissionId), "utf8");
    return JSON.parse(raw) as PendingSubmissionRecord;
  } catch {
    return null;
  }
}

export async function updatePendingSubmission(
  submissionId: string,
  patch: Partial<PendingSubmissionRecord>
): Promise<PendingSubmissionRecord | null> {
  const current = await getPendingSubmission(submissionId);
  if (!current) return null;
  const next: PendingSubmissionRecord = {
    ...current,
    ...patch,
    submissionId: current.submissionId,
    updatedAt: new Date().toISOString(),
  };
  await savePendingSubmission(next);
  return next;
}

export async function deletePendingSubmission(
  submissionId: string
): Promise<void> {
  const store = await getBlobStore();
  if (store) {
    await store.delete(submissionId);
    return;
  }
  try {
    await unlink(fsPath(submissionId));
  } catch {
    /* ignore */
  }
}

/** warm/ops 기본 flush — sheet_logged 제외(옛 잔여 카톡 재발송 방지) */
export const DEFAULT_FLUSH_STATUSES: PendingSubmissionStatus[] = [
  "awaiting_sheet",
  "pending",
];

export async function listPendingSubmissions(
  limit = 20,
  options?: {
    includeFailed?: boolean;
    /** 지정 시 해당 status만. 미지정이면 awaiting/pending/sheet_logged(+failed) */
    statuses?: PendingSubmissionStatus[];
  }
): Promise<PendingSubmissionRecord[]> {
  const cap = Math.min(Math.max(limit, 1), MAX_LIST);
  const includeFailed = options?.includeFailed === true;
  const statusFilter = options?.statuses?.length
    ? new Set(options.statuses)
    : null;
  const store = await getBlobStore();
  const out: PendingSubmissionRecord[] = [];

  const want = (row: PendingSubmissionRecord) => {
    if (statusFilter) {
      if (!statusFilter.has(row.status)) return false;
      if (row.status === "failed" && !includeFailed) return false;
      return true;
    }
    return (
      row.status === "awaiting_sheet" ||
      row.status === "pending" ||
      row.status === "sheet_logged" ||
      (includeFailed && row.status === "failed")
    );
  };
  if (store) {
    const listed = await store.list();
    for (const blob of listed.blobs) {
      if (out.length >= cap) break;
      const row = await store.get(blob.key, { type: "json" });
      if (row && want(row)) out.push(row);
    }
    return out;
  }

  await ensureFsDir();
  const files = await readdir(FS_DIR);
  for (const file of files) {
    if (out.length >= cap) break;
    if (!file.endsWith(".json")) continue;
    try {
      const row = JSON.parse(
        await readFile(path.join(FS_DIR, file), "utf8")
      ) as PendingSubmissionRecord;
      if (want(row)) out.push(row);
    } catch {
      /* skip corrupt */
    }
  }
  return out;
}

export async function summarizePendingSubmissions(
  limit = 50,
  options?: { includePayload?: boolean }
): Promise<{
  total: number;
  awaitingSheet: number;
  pending: number;
  sheetLogged: number;
  failed: number;
  items: Array<{
    submissionId: string;
    siteCode: string;
    status: PendingSubmissionStatus;
    attempts: number;
    lastError?: string;
    createdAt: string;
    updatedAt: string;
    submittedAt?: string;
    needsPostProcess?: boolean;
    /** includePayload=1 일 때만 */
    payload?: Record<string, unknown>;
  }>;
}> {
  const includePayload = options?.includePayload === true;
  const rows = await listPendingSubmissions(limit, { includeFailed: true });
  let pending = 0;
  let awaitingSheet = 0;
  let sheetLogged = 0;
  let failed = 0;
  for (const r of rows) {
    if (r.status === "awaiting_sheet") awaitingSheet++;
    else if (r.status === "pending") pending++;
    else if (r.status === "sheet_logged") sheetLogged++;
    else if (r.status === "failed") failed++;
  }
  return {
    total: rows.length,
    awaitingSheet,
    pending,
    sheetLogged,
    failed,
    items: rows.map((r) => ({
      submissionId: r.submissionId,
      siteCode: r.siteCode,
      status: r.status,
      attempts: r.attempts,
      lastError: r.lastError,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      submittedAt: r.submittedAt,
      needsPostProcess: r.needsPostProcess,
      ...(includePayload ? { payload: r.payload } : {}),
    })),
  };
}
