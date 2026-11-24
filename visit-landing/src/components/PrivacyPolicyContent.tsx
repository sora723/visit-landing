"use client";

import type { ReactNode } from "react";
import type { SiteConfig } from "@/lib/types";
import {
  resolvePrivacyCollectionPurpose,
  resolvePrivacyControllerName,
  resolvePrivacyDisplayValue,
  resolvePrivacyRetentionPeriod,
  resolveRequiredCollectionItems,
} from "@/lib/site-privacy";

/** 필수 개인정보 수집·이용 안내 — 고객 화면에는 한글 라벨만 표시 */
export function PrivacyPolicyContent({ config }: { config: SiteConfig }) {
  const siteCode = config.siteCode;
  const controller = resolvePrivacyControllerName(config);
  const purpose = resolvePrivacyCollectionPurpose(config);
  const retention = resolvePrivacyRetentionPeriod(config);
  const contact =
    config.privacy?.privacyContact?.trim() ||
    config.phone?.trim() ||
    resolvePrivacyDisplayValue(undefined, "privacyContact", siteCode);
  const items = resolveRequiredCollectionItems(config);

  return (
    <>
      <PrivacySection title="개인정보처리자">
        <p>{controller}</p>
      </PrivacySection>

      <PrivacySection title="수집·이용 목적">
        <p>{purpose}</p>
      </PrivacySection>

      <PrivacySection title="수집 항목">
        <PrivacyRow label="필수" value={items.required} />
        {items.optional ? (
          <PrivacyRow label="선택" value={items.optional} />
        ) : null}
      </PrivacySection>

      <PrivacySection title="보유·이용 기간">
        <div className="space-y-2 whitespace-pre-line">{retention}</div>
      </PrivacySection>

      <PrivacySection title="개인정보 처리 위탁">
        <p>
          {controller}은(는) 관심등록·상담신청 접수의 원활한 처리를 위하여
          랜딩페이지 운영 및 개인정보 처리 업무를 수탁업체에 위탁하고 있으며,
          알림 발송 업무는 재수탁을 통해 처리할 수 있습니다.
        </p>
        <div className="mt-2 space-y-1.5">
          <PrivacyRow
            label="수탁"
            value="노드컴퍼니 — 랜딩페이지 운영, 고객정보 접수·저장·관리, 상담 담당자 전달"
          />
          <PrivacyRow
            label="재수탁"
            value="솔라피 — 카카오 알림톡 발송(상담 담당자 대상 신규 접수 알림)"
          />
        </div>
        <p className="mt-2">
          수탁·재수탁 업체명과 위탁업무의 자세한 내용은 개인정보 처리방침에서
          확인하실 수 있습니다.
        </p>
      </PrivacySection>

      <PrivacySection title="동의 거부권 및 불이익">
        <p>
          귀하는 개인정보 수집·이용 동의를 거부할 권리가 있습니다. 다만, 이름과
          연락처는 상담신청 접수 및 안내에 필요한 정보이므로, 해당 동의가 없으면
          온라인 상담신청을 접수할 수 없습니다. 그 외 선택항목을 입력하지 않아도
          상담신청은 가능합니다.
        </p>
      </PrivacySection>

      {contact ? (
        <PrivacySection title="문의">
          <p>{contact}</p>
        </PrivacySection>
      ) : null}
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
      <h2 className="mb-2 text-[13px] font-bold text-[var(--color-navy)]">
        {title}
      </h2>
      <div className="text-[13px] leading-relaxed text-[#5a5a5a]">{children}</div>
    </section>
  );
}

function PrivacyRow({ label, value }: { label: string; value: string }) {
  const accent = label === "필수" || label === "수탁" || label === "재수탁";
  return (
    <div className="mb-1 flex gap-2">
      <span
        className={`min-w-10 shrink-0 text-xs font-semibold ${
          accent ? "text-[var(--color-gold)]" : "text-[#7a7060]"
        }`}
      >
        [{label}]
      </span>
      <span className="text-[13px] text-[#5a5a5a]">{value}</span>
    </div>
  );
}
