/** 현장명(siteName) 기준 페이지 타이틀 — seo.title의 | 접미사만 유지 */
export function buildSitePageTitle(
  siteName: string,
  seoTitle?: string | null
): string {
  const name = siteName.trim();
  if (!name) {
    return seoTitle?.trim() || "방문예약";
  }

  const seo = seoTitle?.trim();
  if (seo) {
    const pipe = seo.indexOf("|");
    if (pipe >= 0) {
      const suffix = seo.slice(pipe + 1).trim();
      if (suffix) return `${name} | ${suffix}`;
    }
  }

  return name;
}
