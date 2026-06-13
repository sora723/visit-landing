import type { Metadata } from "next";
import { fetchSite } from "@/lib/api";
import { SiteProvider } from "@/components/landing/SiteProvider";
import { LandingPage } from "@/components/landing/LandingPage";

interface Props {
  params: Promise<{ siteCode: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { siteCode } = await params;
  try {
    const site = await fetchSite(siteCode);
    return {
      title: site.seo.title,
      description: site.seo.description,
      openGraph: {
        title: site.seo.title,
        description: site.seo.description,
        images: site.seo.ogImage ? [site.seo.ogImage] : [],
      },
      alternates: { canonical: site.seo.canonicalUrl },
    };
  } catch {
    return { title: "분양 홈페이지" };
  }
}

export default async function SitePage({ params }: Props) {
  const { siteCode } = await params;
  const site = await fetchSite(siteCode);

  if (site.meta.status !== "ACTIVE") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy text-white">
        <p>현재 접수가 마감된 현장입니다.</p>
      </div>
    );
  }

  return (
    <SiteProvider site={site}>
      <LandingPage />
    </SiteProvider>
  );
}
