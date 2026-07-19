import type { Metadata } from "next";
import Link from "next/link";
import { PrivacyPolicyContent } from "@/components/PrivacyPolicyContent";
import { getSiteConfigFromFile } from "@/lib/config-source";
import { fetchSiteLiveConfigFromSheet } from "@/lib/fetch-site-live-config";
import { appendSiteCodeQuery } from "@/lib/resolve-site-code";
import { getServerSiteCode } from "@/lib/server-site-code";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "개인정보 수집 및 이용 동의",
  robots: { index: false, follow: false },
};

type PrivacyPageProps = {
  searchParams: Promise<{ siteCode?: string }>;
};

export default async function PrivacyPage({ searchParams }: PrivacyPageProps) {
  const params = await searchParams;
  const siteCode = await getServerSiteCode(params.siteCode);
  const fallback = getSiteConfigFromFile();
  const live = await fetchSiteLiveConfigFromSheet(siteCode);
  const config =
    live.source === "sheet" && live.siteConfig ? live.siteConfig : fallback;
  const managerName =
    config.managerName?.trim() || `${config.siteName} 분양사무소`;
  const homeHref = appendSiteCodeQuery("/", siteCode);

  return (
    <main className="min-h-screen bg-[var(--color-bg)] px-5 py-10 sm:py-16">
      <article className="mx-auto max-w-[680px] overflow-hidden rounded-2xl bg-white shadow-[0_12px_48px_rgba(15,29,58,0.10)]">
        <header className="border-b border-[var(--color-navy)]/8 px-6 py-7 sm:px-9">
          <p className="mb-2 text-[10px] tracking-[0.25em] text-[var(--color-gold)]">
            PRIVACY POLICY
          </p>
          <h1 className="text-xl font-extrabold text-[var(--color-navy)] sm:text-2xl">
            개인정보 수집 및 이용 동의
          </h1>
          <p className="mt-2 text-sm text-[#7a7060]">{config.siteName}</p>
        </header>

        <div className="px-6 py-7 sm:px-9 sm:py-9">
          <PrivacyPolicyContent managerName={managerName} phone={config.phone} />
        </div>

        <footer className="border-t border-[var(--color-navy)]/8 px-6 py-5 sm:px-9">
          <Link
            href={homeHref}
            className="block w-full rounded-lg bg-[var(--color-navy)] py-3.5 text-center text-sm font-bold text-white"
          >
            사이트로 돌아가기
          </Link>
        </footer>
      </article>
    </main>
  );
}
