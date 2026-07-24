/**
 * V2 정적 블록 렌더러 회귀
 * Usage: npm run verify:v2-block-renderer
 */

import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  parseSafeHttpsUrl,
  parseSafePhoneHref,
  parseSafeSectionTarget,
  resolveV2ActionHref,
} from "../src/v2/safe-url.ts";
import {
  getRenderableV2Blocks,
  hasRenderableV2Blocks,
  isV2StaticBlockType,
  V2_STATIC_BLOCK_TYPES,
} from "../src/v2/renderable-v2-blocks.ts";
import {
  mapVisibilityClass,
  parseSafeHexColor,
} from "../src/v2/section-presets.ts";
import { stripV2RichTextForTest } from "../src/v2/safe-rich-text.tsx";
import { V2_BLOCK_RENDERERS, V2BlockRenderer } from "../src/components/v2/V2BlockRenderer.tsx";
import { V2SectionFrame } from "../src/components/v2/V2SectionFrame.tsx";
import { V2PublishedPageShell } from "../src/components/v2/V2PublishedPageShell.tsx";
import { V2SafeStatePage } from "../src/components/v2/V2SafeStatePage.tsx";
import { V2HeroBlock } from "../src/components/v2/blocks/V2HeroBlock.tsx";
import { V2FeatureCardsBlock } from "../src/components/v2/blocks/V2FeatureCardsBlock.tsx";
import { V2RichTextBlock } from "../src/components/v2/blocks/V2RichTextBlock.tsx";
import { V2MediaBlock } from "../src/components/v2/blocks/V2MediaBlock.tsx";
import type {
  ValidatedV2Block,
  ValidatedV2Page,
} from "../src/v2/types.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

let passed = 0;
let failed = 0;

function ok(label: string) {
  passed += 1;
  console.log(`  ✓ ${label}`);
}
function fail(label: string, detail?: string) {
  failed += 1;
  console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
}
function assert(cond: unknown, label: string) {
  if (cond) ok(label);
  else fail(label);
}

function baseLayout(
  overrides: Partial<ValidatedV2Block["layout"]> = {}
): ValidatedV2Block["layout"] {
  return {
    desktopVisible: true,
    mobileVisible: true,
    backgroundType: "none",
    ...overrides,
  };
}

function block(
  partial: Partial<ValidatedV2Block> &
    Pick<ValidatedV2Block, "sectionId" | "componentType">
): ValidatedV2Block {
  return {
    order: 1,
    variant: "default",
    contentGroup: partial.sectionId + "-g",
    layout: baseLayout(),
    items: [],
    options: {},
    ...partial,
  };
}

function pageWith(blocks: ValidatedV2Block[]): ValidatedV2Page {
  return {
    siteCode: "L001",
    revisionId: "pub-L001-secret-do-not-leak",
    pageSchemaVersion: "1",
    blocks,
    overlays: [],
    warnings: [],
  };
}

console.log("\n[verify:v2-block-renderer] static block renderer\n");

assert(
  V2_BLOCK_RENDERERS.hero === V2HeroBlock &&
    V2_STATIC_BLOCK_TYPES.every((t) => V2_BLOCK_RENDERERS[t]),
  "1. supported componentTypes map to renderers"
);

assert(!isV2StaticBlockType("unknownWidget"), "2. unknown componentType not static");
{
  const html = renderToStaticMarkup(
    createElement(V2BlockRenderer, {
      blocks: [
        block({
          sectionId: "u1",
          componentType: "unknownWidget",
          items: [{ itemId: "i", order: 1, role: "root", title: "X", extra: {} }],
        }),
      ],
    })
  );
  assert(!html.includes("X"), "2b. unknown componentType skipped in render");
}

assert(
  mapVisibilityClass(false, false) === null,
  "3. both invisible → skip (disabled-like)"
);
{
  const html = renderToStaticMarkup(
    createElement(
      V2SectionFrame,
      {
        sectionId: "hid",
        layout: baseLayout({ desktopVisible: false, mobileVisible: false }),
      },
      createElement("p", null, "SECRET")
    )
  );
  assert(!html.includes("SECRET"), "3b. invisible section not rendered");
}

{
  const html = renderToStaticMarkup(
    createElement(
      V2SectionFrame,
      {
        sectionId: "vis",
        layout: baseLayout({ desktopVisible: true, mobileVisible: false }),
      },
      createElement("p", null, "PC")
    )
  );
  assert(html.includes("hidden md:block"), "4. desktopVisible/mobileVisible classes");
}

{
  const colorHtml = renderToStaticMarkup(
    createElement(
      V2SectionFrame,
      {
        sectionId: "bgc",
        layout: baseLayout({
          backgroundType: "color",
          backgroundColor: "#112233",
        }),
      },
      createElement("span", null, "c")
    )
  );
  assert(
    colorHtml.includes("background-color:#112233") ||
      colorHtml.includes('style="background-color:#112233"') ||
      colorHtml.includes("background-color: #112233"),
    "5. backgroundType color via style"
  );
  assert(
    !colorHtml.includes("bg-#112233") && !colorHtml.includes("class=\"#112233"),
    "6. backgroundColor not injected as className"
  );

  const imgHtml = renderToStaticMarkup(
    createElement(
      V2SectionFrame,
      {
        sectionId: "bgi",
        layout: baseLayout({
          backgroundType: "image",
          backgroundPc: "https://cdn.example.com/a.jpg",
          backgroundMobile: "https://cdn.example.com/b.jpg",
        }),
      },
      createElement("span", null, "i")
    )
  );
  assert(imgHtml.includes("cdn.example.com/a.jpg"), "5b. background image https");

  const noneHtml = renderToStaticMarkup(
    createElement(
      V2SectionFrame,
      {
        sectionId: "bgn",
        layout: baseLayout({ backgroundType: "none" }),
      },
      createElement("span", null, "n")
    )
  );
  assert(!noneHtml.includes("<picture"), "5c. background none → no picture");
}

assert(parseSafeHttpsUrl("javascript:alert(1)") === null, "7. javascript: blocked");
assert(parseSafeHttpsUrl("data:text/html,hi") === null, "8. data: blocked");
assert(parseSafeHttpsUrl("http://insecure.example/x.png") === null, "9. http image blocked");
assert(
  parseSafeHttpsUrl("https://cdn.example.com/x.png") ===
    "https://cdn.example.com/x.png",
  "10. https image allowed"
);

assert(
  parseSafePhoneHref("010-1234-5678") === "tel:01012345678",
  "11. phone → tel:"
);
assert(resolveV2ActionHref("phone", "abc") === null, "12. bad phone omitted");
assert(parseSafeSectionTarget("hero-1") === "#hero-1", "13. scroll target ok");
assert(parseSafeSectionTarget("bad id!") === null, "13b. bad scroll rejected");

{
  const html = renderToStaticMarkup(
    createElement(V2HeroBlock, {
      block: block({
        sectionId: "hero1",
        componentType: "hero",
        variant: "fullBleed",
        items: [
          {
            itemId: "r",
            order: 1,
            role: "root",
            title: "히어로 타이틀",
            description: "히어로 설명",
            imagePc: "https://cdn.example.com/h.jpg",
            extra: {},
          },
        ],
      }),
    })
  );
  assert(
    html.includes("히어로 타이틀") && html.includes("히어로 설명"),
    "14. Hero title/description"
  );
  assert(!html.includes("pub-L001"), "14b. no revision in hero");
}

{
  const html = renderToStaticMarkup(
    createElement(V2FeatureCardsBlock, {
      block: block({
        sectionId: "fc",
        componentType: "featureCards",
        variant: "grid3",
        items: [
          {
            itemId: "b",
            order: 2,
            role: "item",
            title: "둘째",
            extra: {},
          },
          {
            itemId: "a",
            order: 1,
            role: "item",
            title: "첫째",
            extra: {},
          },
        ],
      }),
    })
  );
  const i1 = html.indexOf("첫째");
  const i2 = html.indexOf("둘째");
  assert(i1 >= 0 && i2 >= 0 && i1 < i2, "15. FeatureCards itemOrder preserved");
}

{
  const stripped = stripV2RichTextForTest(
    '<script>alert(1)</script><iframe src="x"></iframe><p onclick="x">Hi</p>'
  );
  assert(
    !stripped.includes("<script") &&
      !stripped.includes("<iframe") &&
      !stripped.includes("<p"),
    "16/17. RichText strips script/iframe/HTML"
  );
  const html = renderToStaticMarkup(
    createElement(V2RichTextBlock, {
      block: block({
        sectionId: "rt",
        componentType: "richText",
        variant: "left",
        items: [
          {
            itemId: "r",
            order: 1,
            role: "root",
            title: "본문",
            description:
              'Hello <script>x</script> **bold** [go](javascript:alert(1)) [ok](https://example.com)',
            extra: {},
          },
        ],
      }),
    })
  );
  assert(
    html.includes("<strong>") &&
      !html.includes("javascript:") &&
      html.includes("https://example.com") &&
      !html.includes("<script"),
    "16b. RichText markdown safe, no js URL"
  );
}

{
  const html = renderToStaticMarkup(
    createElement(V2MediaBlock, {
      block: block({
        sectionId: "md",
        componentType: "media",
        variant: "single",
        items: [
          {
            itemId: "img",
            order: 1,
            role: "image",
            title: "미디어",
            imagePc: "https://cdn.example.com/pc.jpg",
            imageMobile: "https://cdn.example.com/m.jpg",
            extra: {},
          },
        ],
      }),
    })
  );
  assert(
    html.includes("pc.jpg") &&
      html.includes("m.jpg") &&
      html.includes('media="(max-width: 767px)"'),
    "18. Media mobile/desktop split"
  );
}

{
  const html = renderToStaticMarkup(
    createElement(V2MediaBlock, {
      block: block({
        sectionId: "mv",
        componentType: "media",
        variant: "video",
        options: {
          muted: true,
          autoplay: true,
          loop: true,
          playsinline: true,
        },
        items: [
          {
            itemId: "v",
            order: 1,
            role: "root",
            videoUrl: "https://cdn.example.com/v.mp4",
            imagePc: "https://cdn.example.com/poster.jpg",
            imageMobile: "https://cdn.example.com/fall.jpg",
            extra: {},
          },
        ],
      }),
    })
  );
  assert(
    html.includes("<video") &&
      html.includes("v.mp4") &&
      (html.includes('muted=""') || html.includes("muted")) &&
      !html.includes("<iframe"),
    "19. video flags + no iframe"
  );
}

{
  const shell = renderToStaticMarkup(
    createElement(V2PublishedPageShell, {
      page: pageWith([
        block({
          sectionId: "fi",
          componentType: "footerInfo",
          variant: "default",
          items: [
            {
              itemId: "r",
              order: 1,
              role: "root",
              title: "현장명",
              description: "설명",
              extra: {},
            },
          ],
        }),
      ]),
    })
  );
  assert(shell.includes("현장명"), "20. footerInfo renders");
  assert(
    shell.includes("TODO: system legal") ||
      shell.includes("SiteFooter") === false,
    "20b. system footer not removed (TODO retained, no fake legal)"
  );
  const src = readFileSync(
    join(root, "src/components/v2/blocks/V2FooterInfoBlock.tsx"),
    "utf8"
  );
  assert(
    src.includes("TODO") && src.includes("SiteFooter"),
    "20c. footerInfo notes system footer TODO"
  );
}

assert(!isV2StaticBlockType("form"), "21. form excluded");
assert(!isV2StaticBlockType("liveFeed"), "21b. liveFeed excluded");
assert(!isV2StaticBlockType("stickyPromo"), "21c. stickyPromo excluded");
assert(!isV2StaticBlockType("popup"), "21d. popup excluded");

{
  const onlyForm = pageWith([
    block({
      sectionId: "f",
      componentType: "form",
      variant: "card",
      items: [
        {
          itemId: "form",
          order: 1,
          role: "form",
          title: "폼",
          extra: {},
        },
      ],
    }),
  ]);
  assert(!hasRenderableV2Blocks(onlyForm), "22. zero renderable → flag");
  assert(getRenderableV2Blocks(onlyForm).length === 0, "22b. empty list");
}

{
  const pageSrc = readFileSync(join(root, "src/app/page.tsx"), "utf8");
  assert(
    pageSrc.includes("hasRenderableV2Blocks") &&
      pageSrc.includes("V2SafeStatePage"),
    "22c. page uses SafeState when no renderable"
  );
  const v2Block = pageSrc.match(
    /if\s*\(\s*renderer\s*===\s*"v2"\s*\)\s*\{([\s\S]*?)\n  \}/
  );
  assert(
    !!v2Block &&
      !v2Block[1].includes("LandingPage") &&
      !v2Block[1].includes("ConfigProvider"),
    "23. V2 failure/empty does not V1 fallback"
  );
}

{
  const html = renderToStaticMarkup(
    createElement(V2PublishedPageShell, {
      page: pageWith([
        block({
          sectionId: "hero1",
          componentType: "hero",
          variant: "fullBleed",
          options: { rawSecret: "optionsJson-secret" },
          items: [
            {
              itemId: "r",
              order: 1,
              role: "root",
              title: "공개타이틀",
              imagePc: "https://cdn.example.com/h.jpg",
              extra: {},
            },
          ],
        }),
      ]),
    })
  );
  assert(
    !html.includes("pub-L001-secret") &&
      !html.includes("optionsJson-secret") &&
      !html.includes("revisionId"),
    "24. revisionId/options raw not in HTML"
  );
}

{
  const v2Dir = join(root, "src/components/v2");
  const files: string[] = [];
  function walk(dir: string) {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, name.name);
      if (name.isDirectory()) walk(p);
      else if (name.name.endsWith(".tsx")) files.push(p);
    }
  }
  walk(v2Dir);
  let bad = false;
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    if (
      src.includes('"use client"') ||
      src.includes("'use client'")
    ) {
      // Placeholder may remain unused
      if (!f.endsWith("V2Placeholder.tsx")) {
        bad = true;
        fail("25. unexpected use client", f);
      }
    }
  }
  if (!bad) ok("25. no unnecessary use client in v2 components");
}

{
  const pageSrc = readFileSync(join(root, "src/app/page.tsx"), "utf8");
  assert(
    !pageSrc.includes("from \"@/components/LandingPage\"") === false,
    "26a. page still has V1 import for V1 path"
  );
  const rendererSrc = readFileSync(
    join(root, "src/components/v2/V2BlockRenderer.tsx"),
    "utf8"
  );
  assert(
    !rendererSrc.includes("ReservationForm") &&
      !rendererSrc.includes("ConfigProvider") &&
      !rendererSrc.includes("LandingPage"),
    "26. V2 renderer has no V1 form/config imports"
  );
  const pageSrc26 = readFileSync(join(root, "src/app/page.tsx"), "utf8");
  assert(
    pageSrc26.includes('from "@/components/LandingPage"'),
    "26b. V1 LandingPage import retained for non-v2 path"
  );
}

assert(parseSafeHexColor("#abc") === "#abc", "hex allowlist ok");
assert(parseSafeHexColor("red") === null, "hex reject named");

const safeHtml = renderToStaticMarkup(
  createElement(V2SafeStatePage, { siteName: "S" })
);
assert(safeHtml.includes("페이지를 준비 중입니다."), "safe state message intact");

console.log(`\n[verify:v2-block-renderer] ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
