// Apps Script 웹 앱 URL — 배포 후 실제 URL로 교체하세요
const APPS_SCRIPT_URL = "YOUR_APPS_SCRIPT_WEB_APP_URL";

export interface SubmitPayload {
  name: string;
  phone: string;
  unitType?: string;
  visitDate?: string;
  visitTime?: string;
  source?: string; // "bottom_bar" | "reservation_form"
}

export async function submitReservation(payload: SubmitPayload): Promise<boolean> {
  // APPS_SCRIPT_URL 미설정 시 콘솔에만 기록
  if (APPS_SCRIPT_URL === "YOUR_APPS_SCRIPT_WEB_APP_URL") {
    console.log("[submitApi] 접수 데이터 (Apps Script URL 미설정):", payload);
    return true;
  }

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors", // Apps Script CORS 대응
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submit",
        siteCode: "L001",
        siteName: "원주한양립스",
        name: payload.name,
        phone: payload.phone,
        unitType: payload.unitType ?? "미정",
        visitDate: payload.visitDate ?? "",
        visitTime: payload.visitTime ?? "",
        source: payload.source ?? "landing",
        submittedAt: new Date().toISOString(),
      }),
    });
    // no-cors 모드에서는 응답 본문 접근 불가 — fetch 성공 자체가 전송 완료
    console.log("[submitApi] 전송 완료", res.type);
    return true;
  } catch (err) {
    console.error("[submitApi] 전송 실패:", err);
    return false;
  }
}

// 실시간 현황에 접수 추가 이벤트 발행
export function dispatchNewReservation(name: string, phone: string) {
  const surname = name.trim().charAt(0) || "김";
  const maskedPhone = phone.replace(/(\d{3})-?(\d{4})-?(\d{4})/, "010-****-$3");
  window.dispatchEvent(
    new CustomEvent("newReservation", {
      detail: { surname, phone: maskedPhone },
    })
  );
}
