/**
 * Preview 전용 상단 배너 — 문서 흐름 (fixed 아님).
 * revisionId / token / 내부 오류 미표시.
 */

import React from "react";

export function V2PreviewBanner() {
  return (
    <div
      role="status"
      className="border-b border-amber-200/80 bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-950"
    >
      V2 미리보기 — 운영 페이지에는 아직 반영되지 않았습니다.
    </div>
  );
}
