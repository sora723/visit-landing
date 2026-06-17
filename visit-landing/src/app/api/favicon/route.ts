import { fetchFaviconBytes } from "@/lib/favicon-proxy";

export const dynamic = "force-dynamic";

/** /favicon.ico rewrite 대상 — 시트 파비콘 프록시 */
export async function GET() {
  const favicon = await fetchFaviconBytes();
  if (!favicon) {
    return new Response(null, { status: 404 });
  }

  return new Response(favicon.body, {
    headers: {
      "Content-Type": favicon.contentType,
      "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
    },
  });
}
