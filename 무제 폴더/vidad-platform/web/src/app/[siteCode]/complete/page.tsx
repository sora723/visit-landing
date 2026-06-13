import Link from "next/link";
import { fetchSite } from "@/lib/api";

interface Props {
  params: Promise<{ siteCode: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { siteCode } = await params;
  try {
    const site = await fetchSite(siteCode);
    return { title: `${site.meta.siteName} — 접수 완료` };
  } catch {
    return { title: "접수 완료" };
  }
}

export default async function CompletePage({ params }: Props) {
  const { siteCode } = await params;
  let siteName = siteCode;

  try {
    const site = await fetchSite(siteCode);
    siteName = site.meta.siteName;
  } catch {
    // demo fallback
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy p-6">
      <div className="w-full max-w-md rounded-sm bg-white p-10 text-center shadow-2xl">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-2xl text-gold">
          ✓
        </div>
        <h1 className="mb-3 text-xl font-bold text-navy">관심고객 등록이 완료되었습니다</h1>
        <p className="mb-2 text-sm text-muted">담당자가 확인 후 빠른 시일 내에 연락드리겠습니다.</p>
        <p className="mb-8 font-semibold text-navy">{siteName}</p>
        <Link
          href={`/${siteCode}`}
          className="inline-block w-full bg-gold py-4 text-sm font-semibold text-navy transition hover:bg-gold-light"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
