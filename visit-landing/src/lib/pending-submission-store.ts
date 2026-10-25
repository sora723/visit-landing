/**
 * 접수 임시 원장 — 완료 UI 전에 먼저 남김.
 * Netlify Blobs(강일관성) 우선, 로컬/미구성 시 .data 폴백.
 */

import { mkdir, readdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

export type PendingSubmissionStatus =
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

export async function listPendingSubmissions(
  limit = 20
): Promise<PendingSubmissionRecord[]> {
  const cap = Math.min(Math.max(limit, 1), MAX_LIST);
  const store = await getBlobStore();
  const out: PendingSubmissionRecord[] = [];

  if (store) {
    const listed = await store.list();
    for (const blob of listed.blobs) {
      if (out.length >= cap) break;
      const row = await store.get(blob.key, { type: "json" });
      if (row && (row.status === "pending" || row.status === "sheet_logged")) {
        out.push(row);
      }
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
      if (row.status === "pending" || row.status === "sheet_logged") {
        out.push(row);
      }
    } catch {
      /* skip corrupt */
    }
  }
  return out;
}
