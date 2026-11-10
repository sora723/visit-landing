/**
 * 운영 Slack 알림 — siteCode 별로 메시지에 현장을 명시해 혼선 방지.
 * OPS_ALERT_WEBHOOK_URL 또는 SLACK_OPS_WEBHOOK_URL
 */

function getOpsWebhookUrl(): string {
  return (
    String(process.env.OPS_ALERT_WEBHOOK_URL || "").trim() ||
    String(process.env.SLACK_OPS_WEBHOOK_URL || "").trim()
  );
}

export async function postOpsSlack(text: string): Promise<boolean> {
  const url = getOpsWebhookUrl();
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(8_000),
    });
    return res.ok;
  } catch (err) {
    console.error(
      "[ops-slack] post failed",
      err instanceof Error ? err.message : err
    );
    return false;
  }
}

function summarizePayload(payload?: Record<string, unknown> | null): string[] {
  if (!payload) return [];
  const name = String(payload.name ?? "").trim();
  const phone = String(payload.phone ?? "").trim();
  const visitDate = String(payload.visitDate ?? "").trim();
  const visitTime = String(payload.visitTime ?? "").trim();
  const unitType = String(payload.unitType ?? "").trim();
  const region = String(payload.region ?? "").trim();
  const lines: string[] = [];
  if (name) lines.push(`이름: ${name}`);
  if (phone) lines.push(`전화: ${phone}`);
  if (unitType) lines.push(`평형: ${unitType}`);
  if (visitDate || visitTime) {
    lines.push(`방문: ${[visitDate, visitTime].filter(Boolean).join(" ")}`);
  }
  if (region) lines.push(`지역: ${region}`);
  return lines;
}

/** BUSY → Blobs 임시보관 (완료 UI 없음) */
export async function alertBusyPendingSaved(opts: {
  siteCode: string;
  submissionId: string;
  reason: string;
  payload?: Record<string, unknown> | null;
}): Promise<void> {
  const site = opts.siteCode || "?";
  await postOpsSlack(
    [
      `[visit-landing] BUSY 임시보관`,
      `siteCode: ${site}`,
      `submissionId: ${opts.submissionId}`,
      `reason: ${opts.reason}`,
      `상태: awaiting_sheet (복구 대기 — 완료 UI 없음)`,
      ...summarizePayload(opts.payload),
    ].join("\n")
  );
}

/** 제출/복구 실패 */
export async function alertSubmitOpsFailure(opts: {
  siteCode: string;
  submissionId?: string;
  stage: string;
  reason: string;
}): Promise<void> {
  const site = opts.siteCode || "?";
  await postOpsSlack(
    [
      `[visit-landing] 접수 실패`,
      `siteCode: ${site}`,
      `stage: ${opts.stage}`,
      opts.submissionId ? `submissionId: ${opts.submissionId}` : null,
      `reason: ${opts.reason}`,
    ]
      .filter(Boolean)
      .join("\n")
  );
}
