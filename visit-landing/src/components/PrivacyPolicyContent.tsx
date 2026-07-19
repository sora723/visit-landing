import type { ReactNode } from "react";

export function PrivacyPolicyContent({
  managerName,
  phone,
}: {
  managerName: string;
  phone: string;
}) {
  return (
    <>
      <PrivacySection title="■ 수집주체 (관리자명)">
        <p>{managerName}</p>
      </PrivacySection>

      <PrivacySection title="■ 수집 항목">
        <PrivacyRow label="필수" value="성명, 연락처(휴대폰번호)" />
        <PrivacyRow label="선택" value="관심평형, 방문예약 일자" />
      </PrivacySection>

      <PrivacySection title="■ 수집 목적">
        <p>분양 상담 및 방문예약 확인 연락, 알림톡(카카오 비즈메시지) 발송</p>
      </PrivacySection>

      <PrivacySection title="■ 보유 및 이용기간">
        <p>동의 철회 요청 시 또는 분양 상담 목적 달성 후 지체 없이 파기합니다.</p>
        <p className="mt-1.5">
          단, 계약 체결 시에는 관련 법령(전자상거래 등에서의 소비자보호에 관한 법률 등)에
          따라 일정 기간 보관될 수 있습니다.
        </p>
      </PrivacySection>

      <PrivacySection title="■ 제3자 제공">
        <p>수집된 개인정보는 원칙적으로 외부에 제공하지 않습니다.</p>
        <p className="mt-1.5">
          단, 알림톡 발송을 위해 카카오 비즈메시지 서비스 제공자(Solapi)에 연락처를
          최소한으로 제공할 수 있으며, 해당 업체는 법령에 의한 의무 외의 목적으로
          사용하지 않습니다.
        </p>
      </PrivacySection>

      <PrivacySection title="■ 동의 거부 권리 및 불이익">
        <p>
          귀하는 개인정보 수집·이용에 동의를 거부할 권리가 있습니다. 단, 거부하실 경우
          분양 상담 및 방문예약 서비스 이용이 제한될 수 있습니다.
        </p>
      </PrivacySection>

      <PrivacySection title="■ 문의">
        <p>개인정보 관련 문의: {managerName}</p>
        <p className="mt-1">대표번호: {phone}</p>
      </PrivacySection>

      <div className="mt-5 rounded-lg bg-[var(--color-bg)] p-4 text-xs leading-relaxed text-[#7a7060]">
        본 개인정보 처리방침은 개인정보보호법 제30조에 의거하여 작성되었으며, 관련
        법령의 변경 또는 서비스 정책 변경에 따라 내용이 수정될 수 있습니다.
      </div>
    </>
  );
}

function PrivacySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-5">
      <h2 className="mb-2 text-[13px] font-bold text-[var(--color-navy)]">{title}</h2>
      <div className="text-[13px] leading-relaxed text-[#5a5a5a]">{children}</div>
    </section>
  );
}

function PrivacyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-1 flex gap-2">
      <span
        className={`min-w-8 shrink-0 text-xs font-semibold ${
          label === "필수" ? "text-[var(--color-gold)]" : "text-[#7a7060]"
        }`}
      >
        [{label}]
      </span>
      <span className="text-[13px] text-[#5a5a5a]">{value}</span>
    </div>
  );
}
