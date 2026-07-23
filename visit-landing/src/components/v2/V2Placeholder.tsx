/**
 * TEMPORARY — V2 자유형 렌더러 자리 표시자.
 * 실제 V2 Sheet/블록 렌더러가 준비되면 이 컴포넌트를 교체한다.
 * 폼·전환·popup·liveFeed를 실행하지 않는다.
 */

import type { ResolvedRendererVersion } from "@/lib/resolve-renderer-version";

type Props = {
  siteCode: string;
  /** 정규화된 값 — production UI에는 노출하지 않음 */
  renderer: ResolvedRendererVersion;
};

export function V2Placeholder({ siteCode, renderer }: Props) {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <>
      <meta name="robots" content="noindex, nofollow" />
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#0f1a2e] px-6 py-16 text-center text-white">
        <div className="max-w-md space-y-3">
          <p className="text-base font-medium tracking-wide">
            페이지를 준비 중입니다
          </p>
          {isDev ? (
            <p className="font-mono text-xs text-white/50">
              [dev] siteCode={siteCode} renderer={renderer}
            </p>
          ) : null}
        </div>
      </main>
    </>
  );
}
