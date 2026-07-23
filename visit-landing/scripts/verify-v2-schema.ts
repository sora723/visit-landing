/**
 * V2 schema · registry · validation 회귀
 * Usage: npm run verify:v2-schema
 */

import { validateV2Page } from "../src/v2/validate-v2-page";
import { parseSafeJsonObject } from "../src/v2/safe-json";
import type { V2BlockRow, V2ContentRow } from "../src/v2/types";

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

function assert(cond: boolean, label: string, detail?: string) {
  if (cond) ok(label);
  else fail(label, detail);
}

function block(
  overrides: Partial<V2BlockRow> &
    Pick<V2BlockRow, "sectionId" | "contentGroup" | "componentType">
): V2BlockRow {
  return {
    siteCode: "L010",
    revisionId: "draft-L010-1",
    sectionOrder: 1,
    variant: "",
    enabled: true,
    desktopVisible: true,
    mobileVisible: true,
    backgroundType: "none",
    backgroundColor: "",
    backgroundPc: "",
    backgroundMobile: "",
    themeVariant: "",
    paddingPreset: "",
    animationPreset: "",
    optionsJson: "{}",
    ...overrides,
  };
}

function content(
  overrides: Partial<V2ContentRow> &
    Pick<V2ContentRow, "contentGroup" | "itemId" | "role">
): V2ContentRow {
  return {
    siteCode: "L010",
    revisionId: "draft-L010-1",
    itemOrder: 1,
    eyebrow: "",
    title: "",
    subtitle: "",
    description: "",
    value: "",
    badge: "",
    icon: "",
    imagePc: "",
    imageMobile: "",
    videoUrl: "",
    actionType: "",
    actionLabel: "",
    actionValue: "",
    extraJson: "{}",
    enabled: true,
    ...overrides,
  };
}

const SCOPE = {
  siteCode: "L010",
  revisionId: "draft-L010-1",
  pageSchemaVersion: "1" as const,
};

console.log("\n[verify:v2-schema] V2 contract / registry / validation\n");

// 1. hero + form
{
  const blocks = [
    block({
      sectionId: "sec-hero",
      contentGroup: "cg-hero",
      componentType: "hero",
      sectionOrder: 1,
      variant: "fullBleed",
    }),
    block({
      sectionId: "sec-form",
      contentGroup: "cg-form",
      componentType: "form",
      sectionOrder: 2,
      variant: "card",
    }),
  ];
  const contents = [
    content({
      contentGroup: "cg-hero",
      itemId: "h1",
      role: "root",
      title: "방문하세요",
    }),
    content({
      contentGroup: "cg-form",
      itemId: "f1",
      role: "form",
      title: "예약",
    }),
  ];
  const result = validateV2Page({ ...SCOPE, blocks, contents });
  assert(
    result.ok === true &&
      result.page.blocks.length === 2 &&
      result.page.blocks[0].componentType === "hero" &&
      result.page.blocks[1].componentType === "form",
    "1. normal hero + form page"
  );
}

// 2. featureCards items
{
  const blocks = [
    block({
      sectionId: "sec-cards",
      contentGroup: "cg-cards",
      componentType: "featureCards",
      sectionOrder: 1,
    }),
  ];
  const contents = [
    content({
      contentGroup: "cg-cards",
      itemId: "c1",
      role: "item",
      itemOrder: 2,
      title: "B",
    }),
    content({
      contentGroup: "cg-cards",
      itemId: "c2",
      role: "item",
      itemOrder: 1,
      title: "A",
    }),
  ];
  const result = validateV2Page({ ...SCOPE, blocks, contents });
  assert(
    result.ok === true &&
      result.page.blocks[0].items.map((i) => i.title).join(",") === "A,B",
    "2. featureCards repeating items (sorted)"
  );
}

// 3. foreign siteCode
{
  const blocks = [
    block({
      sectionId: "sec-hero",
      contentGroup: "cg-hero",
      componentType: "hero",
    }),
    block({
      siteCode: "OTHER",
      sectionId: "sec-x",
      contentGroup: "cg-x",
      componentType: "hero",
      sectionOrder: 2,
    }),
  ];
  const contents = [
    content({
      contentGroup: "cg-hero",
      itemId: "h1",
      role: "root",
      title: "OK",
    }),
    content({
      siteCode: "OTHER",
      contentGroup: "cg-x",
      itemId: "x1",
      role: "root",
      title: "Nope",
    }),
  ];
  const result = validateV2Page({ ...SCOPE, blocks, contents });
  assert(
    result.ok === true &&
      result.page.blocks.length === 1 &&
      result.warnings.some((w) => w.code === "foreign_block_scope"),
    "3. foreign siteCode rows excluded"
  );
}

// 4. foreign revisionId
{
  const blocks = [
    block({
      sectionId: "sec-hero",
      contentGroup: "cg-hero",
      componentType: "hero",
    }),
    block({
      revisionId: "other-rev",
      sectionId: "sec-y",
      contentGroup: "cg-y",
      componentType: "hero",
      sectionOrder: 2,
    }),
  ];
  const contents = [
    content({
      contentGroup: "cg-hero",
      itemId: "h1",
      role: "root",
      title: "OK",
    }),
    content({
      revisionId: "other-rev",
      contentGroup: "cg-y",
      itemId: "y1",
      role: "root",
      title: "Nope",
    }),
  ];
  const result = validateV2Page({ ...SCOPE, blocks, contents });
  assert(
    result.ok === true && result.page.blocks.length === 1,
    "4. foreign revisionId rows excluded"
  );
}

// 5. duplicate sectionId — later excluded
{
  const blocks = [
    block({
      sectionId: "dup",
      contentGroup: "cg-a",
      componentType: "hero",
      sectionOrder: 1,
    }),
    block({
      sectionId: "dup",
      contentGroup: "cg-b",
      componentType: "form",
      sectionOrder: 2,
    }),
  ];
  const contents = [
    content({
      contentGroup: "cg-a",
      itemId: "h1",
      role: "root",
      title: "First",
    }),
    content({
      contentGroup: "cg-b",
      itemId: "f1",
      role: "form",
    }),
  ];
  const result = validateV2Page({ ...SCOPE, blocks, contents });
  assert(
    result.ok === true &&
      result.page.blocks.length === 1 &&
      result.page.blocks[0].componentType === "hero" &&
      result.warnings.some((w) => w.code === "duplicate_section_id"),
    "5. duplicate sectionId — later excluded"
  );
}

// 6. duplicate contentGroup — later excluded
{
  const blocks = [
    block({
      sectionId: "s1",
      contentGroup: "same",
      componentType: "hero",
      sectionOrder: 1,
    }),
    block({
      sectionId: "s2",
      contentGroup: "same",
      componentType: "form",
      sectionOrder: 2,
    }),
  ];
  const contents = [
    content({
      contentGroup: "same",
      itemId: "h1",
      role: "root",
      title: "Hero",
    }),
  ];
  const result = validateV2Page({ ...SCOPE, blocks, contents });
  assert(
    result.ok === true &&
      result.page.blocks.length === 1 &&
      result.warnings.some((w) => w.code === "duplicate_content_group"),
    "6. duplicate contentGroup — later block excluded"
  );
}

// 7. duplicate itemId — later excluded
{
  const blocks = [
    block({
      sectionId: "sec-cards",
      contentGroup: "cg-cards",
      componentType: "featureCards",
    }),
  ];
  const contents = [
    content({
      contentGroup: "cg-cards",
      itemId: "same",
      role: "item",
      itemOrder: 1,
      title: "First",
    }),
    content({
      contentGroup: "cg-cards",
      itemId: "same",
      role: "item",
      itemOrder: 2,
      title: "Second",
    }),
  ];
  const result = validateV2Page({ ...SCOPE, blocks, contents });
  assert(
    result.ok === true &&
      result.page.blocks[0].items.length === 1 &&
      result.page.blocks[0].items[0].title === "First" &&
      result.warnings.some((w) => w.code === "duplicate_item_id"),
    "7. duplicate itemId — later excluded"
  );
}

// 8. unknown componentType excluded
{
  const blocks = [
    block({
      sectionId: "sec-hero",
      contentGroup: "cg-hero",
      componentType: "hero",
    }),
    block({
      sectionId: "sec-bad",
      contentGroup: "cg-bad",
      componentType: "customHtml",
      sectionOrder: 2,
    }),
  ];
  const contents = [
    content({
      contentGroup: "cg-hero",
      itemId: "h1",
      role: "root",
      title: "OK",
    }),
  ];
  const result = validateV2Page({ ...SCOPE, blocks, contents });
  assert(
    result.ok === true &&
      result.page.blocks.length === 1 &&
      result.warnings.some((w) => w.code === "unknown_component_type"),
    "8. unknown componentType excluded"
  );
}

// 9. invalid variant → default
{
  const blocks = [
    block({
      sectionId: "sec-hero",
      contentGroup: "cg-hero",
      componentType: "hero",
      variant: "split",
    }),
  ];
  const contents = [
    content({
      contentGroup: "cg-hero",
      itemId: "h1",
      role: "root",
      title: "OK",
    }),
  ];
  const result = validateV2Page({ ...SCOPE, blocks, contents });
  assert(
    result.ok === true &&
      result.page.blocks[0].variant === "fullBleed" &&
      result.warnings.some((w) => w.code === "invalid_variant"),
    "9. invalid variant → defaultVariant"
  );
}

// 10. optionsJson error → defaults
{
  const blocks = [
    block({
      sectionId: "sec-hero",
      contentGroup: "cg-hero",
      componentType: "hero",
      optionsJson: "{not-json",
    }),
  ];
  const contents = [
    content({
      contentGroup: "cg-hero",
      itemId: "h1",
      role: "root",
      title: "OK",
    }),
  ];
  const result = validateV2Page({ ...SCOPE, blocks, contents });
  assert(
    result.ok === true &&
      result.warnings.some((w) => w.code === "options_json_error") &&
      Object.keys(result.page.blocks[0].options).length === 0,
    "10. optionsJson error → default options"
  );
}

// 11. extraJson error → {}
{
  const blocks = [
    block({
      sectionId: "sec-hero",
      contentGroup: "cg-hero",
      componentType: "hero",
    }),
  ];
  const contents = [
    content({
      contentGroup: "cg-hero",
      itemId: "h1",
      role: "root",
      title: "OK",
      extraJson: "{bad",
    }),
  ];
  const result = validateV2Page({ ...SCOPE, blocks, contents });
  assert(
    result.ok === true &&
      result.warnings.some((w) => w.code === "extra_json_error") &&
      Object.keys(result.page.blocks[0].items[0].extra).length === 0,
    "11. extraJson error → empty object"
  );
}

// 12. missing required root → block excluded
{
  const blocks = [
    block({
      sectionId: "sec-hero",
      contentGroup: "cg-hero",
      componentType: "hero",
    }),
    block({
      sectionId: "sec-form",
      contentGroup: "cg-form",
      componentType: "form",
      sectionOrder: 2,
    }),
  ];
  const contents = [
    content({
      contentGroup: "cg-hero",
      itemId: "h1",
      role: "cta",
      actionLabel: "Go",
      actionType: "scroll",
    }),
    content({
      contentGroup: "cg-form",
      itemId: "f1",
      role: "form",
    }),
  ];
  const result = validateV2Page({ ...SCOPE, blocks, contents });
  assert(
    result.ok === true &&
      result.page.blocks.length === 1 &&
      result.page.blocks[0].componentType === "form" &&
      result.warnings.some((w) => w.code === "block_missing_required_content"),
    "12. missing required root → block excluded"
  );
}

// 13. missing required item fields → item excluded
{
  const blocks = [
    block({
      sectionId: "sec-cards",
      contentGroup: "cg-cards",
      componentType: "featureCards",
    }),
  ];
  const contents = [
    content({
      contentGroup: "cg-cards",
      itemId: "good",
      role: "item",
      title: "Has title",
    }),
    content({
      contentGroup: "cg-cards",
      itemId: "bad",
      role: "item",
      title: "",
      itemOrder: 2,
    }),
  ];
  const result = validateV2Page({ ...SCOPE, blocks, contents });
  assert(
    result.ok === true &&
      result.page.blocks[0].items.length === 1 &&
      result.warnings.some((w) => w.code === "item_missing_required_fields"),
    "13. missing required item fields → item excluded"
  );
}

// 14. popup ×2 → later excluded
{
  const blocks = [
    block({
      sectionId: "sec-hero",
      contentGroup: "cg-hero",
      componentType: "hero",
      sectionOrder: 1,
    }),
    block({
      sectionId: "pop1",
      contentGroup: "cg-p1",
      componentType: "popup",
      variant: "image",
      sectionOrder: 90,
    }),
    block({
      sectionId: "pop2",
      contentGroup: "cg-p2",
      componentType: "popup",
      variant: "image",
      sectionOrder: 91,
    }),
  ];
  const contents = [
    content({
      contentGroup: "cg-hero",
      itemId: "h1",
      role: "root",
      title: "H",
    }),
    content({
      contentGroup: "cg-p1",
      itemId: "r1",
      role: "root",
      title: "P1",
    }),
    content({
      contentGroup: "cg-p1",
      itemId: "i1",
      role: "image",
      imagePc: "https://example.com/a.jpg",
      itemOrder: 2,
    }),
    content({
      contentGroup: "cg-p2",
      itemId: "r2",
      role: "root",
      title: "P2",
    }),
    content({
      contentGroup: "cg-p2",
      itemId: "i2",
      role: "image",
      imagePc: "https://example.com/b.jpg",
      itemOrder: 2,
    }),
  ];
  const result = validateV2Page({ ...SCOPE, blocks, contents });
  assert(
    result.ok === true &&
      result.page.overlays.filter((o) => o.componentType === "popup").length ===
        1 &&
      result.warnings.some((w) => w.code === "overlay_max_exceeded"),
    "14. popup ×2 → later excluded"
  );
}

// 15. stickyPromo ×2 → later excluded
{
  const blocks = [
    block({
      sectionId: "sec-hero",
      contentGroup: "cg-hero",
      componentType: "hero",
    }),
    block({
      sectionId: "st1",
      contentGroup: "cg-st1",
      componentType: "stickyPromo",
      sectionOrder: 80,
    }),
    block({
      sectionId: "st2",
      contentGroup: "cg-st2",
      componentType: "stickyPromo",
      sectionOrder: 81,
    }),
  ];
  const contents = [
    content({
      contentGroup: "cg-hero",
      itemId: "h1",
      role: "root",
      title: "H",
    }),
    content({
      contentGroup: "cg-st1",
      itemId: "s1",
      role: "root",
      title: "Promo1",
    }),
    content({
      contentGroup: "cg-st2",
      itemId: "s2",
      role: "root",
      title: "Promo2",
    }),
  ];
  const result = validateV2Page({ ...SCOPE, blocks, contents });
  assert(
    result.ok === true &&
      result.page.overlays.filter((o) => o.componentType === "stickyPromo")
        .length === 1,
    "15. stickyPromo ×2 → later excluded"
  );
}

// 16. no footerInfo → ok
{
  const blocks = [
    block({
      sectionId: "sec-hero",
      contentGroup: "cg-hero",
      componentType: "hero",
    }),
  ];
  const contents = [
    content({
      contentGroup: "cg-hero",
      itemId: "h1",
      role: "root",
      title: "H",
    }),
  ];
  const result = validateV2Page({ ...SCOPE, blocks, contents });
  assert(
    result.ok === true &&
      !result.page.blocks.some((b) => b.componentType === "footerInfo"),
    "16. no footerInfo → still ok"
  );
}

// 17. overlays only → fatal
{
  const blocks = [
    block({
      sectionId: "st1",
      contentGroup: "cg-st1",
      componentType: "stickyPromo",
    }),
  ];
  const contents = [
    content({
      contentGroup: "cg-st1",
      itemId: "s1",
      role: "root",
      title: "Promo",
    }),
  ];
  const result = validateV2Page({ ...SCOPE, blocks, contents });
  assert(
    result.ok === false &&
      result.fatalErrors.some((e) => e.code === "no_valid_document_blocks"),
    "17. overlays only → fatal"
  );
}

// 18. all blocks invalid → fatal
{
  const blocks = [
    block({
      sectionId: "sec-hero",
      contentGroup: "cg-hero",
      componentType: "hero",
    }),
  ];
  const contents = [
    content({
      contentGroup: "cg-hero",
      itemId: "h1",
      role: "cta",
      actionLabel: "x",
      actionType: "tel",
    }),
  ];
  const result = validateV2Page({ ...SCOPE, blocks, contents });
  assert(
    result.ok === false &&
      result.fatalErrors.some((e) => e.code === "no_valid_document_blocks"),
    "18. all blocks invalid → fatal"
  );
}

// 19. unsupported pageSchemaVersion → fatal
{
  const result = validateV2Page({
    ...SCOPE,
    pageSchemaVersion: "99",
    blocks: [
      block({
        sectionId: "sec-hero",
        contentGroup: "cg-hero",
        componentType: "hero",
      }),
    ],
    contents: [
      content({
        contentGroup: "cg-hero",
        itemId: "h1",
        role: "root",
        title: "H",
      }),
    ],
  });
  assert(
    result.ok === false &&
      result.fatalErrors.some(
        (e) => e.code === "unsupported_page_schema_version"
      ),
    "19. unsupported pageSchemaVersion → fatal"
  );
}

// 20. disabled block/item excluded
{
  const blocks = [
    block({
      sectionId: "sec-hero",
      contentGroup: "cg-hero",
      componentType: "hero",
    }),
    block({
      sectionId: "sec-off",
      contentGroup: "cg-off",
      componentType: "notice",
      enabled: "N",
      sectionOrder: 2,
    }),
  ];
  const contents = [
    content({
      contentGroup: "cg-hero",
      itemId: "h1",
      role: "root",
      title: "H",
    }),
    content({
      contentGroup: "cg-hero",
      itemId: "stat-off",
      role: "stat",
      title: "Hidden",
      enabled: false,
      itemOrder: 2,
    }),
    content({
      contentGroup: "cg-off",
      itemId: "n1",
      role: "root",
      title: "Off",
    }),
  ];
  const result = validateV2Page({ ...SCOPE, blocks, contents });
  assert(
    result.ok === true &&
      result.page.blocks.length === 1 &&
      result.page.blocks[0].items.length === 1 &&
      result.warnings.some((w) => w.code === "block_disabled") &&
      result.warnings.some((w) => w.code === "content_disabled"),
    "20. disabled block/item excluded"
  );
}

// 21. PC/mobile visibility normalize
{
  const blocks = [
    block({
      sectionId: "sec-hero",
      contentGroup: "cg-hero",
      componentType: "hero",
      desktopVisible: "Y",
      mobileVisible: "N",
    }),
  ];
  const contents = [
    content({
      contentGroup: "cg-hero",
      itemId: "h1",
      role: "root",
      title: "H",
    }),
  ];
  const result = validateV2Page({ ...SCOPE, blocks, contents });
  assert(
    result.ok === true &&
      result.page.blocks[0].layout.desktopVisible === true &&
      result.page.blocks[0].layout.mobileVisible === false,
    "21. PC/mobile visibility normalize"
  );
}

// 22. invalid backgroundType → none
{
  const blocks = [
    block({
      sectionId: "sec-hero",
      contentGroup: "cg-hero",
      componentType: "hero",
      backgroundType: "video",
    }),
  ];
  const contents = [
    content({
      contentGroup: "cg-hero",
      itemId: "h1",
      role: "root",
      title: "H",
    }),
  ];
  const result = validateV2Page({ ...SCOPE, blocks, contents });
  assert(
    result.ok === true &&
      result.page.blocks[0].layout.backgroundType === "none" &&
      result.warnings.some((w) => w.code === "invalid_background_type"),
    "22. invalid backgroundType safe handling"
  );
}

// 23. prototype pollution JSON
{
  const polluted = parseSafeJsonObject(
    '{"ok":1,"__proto__":{"polluted":true},"constructor":{"prototype":{"x":1}}}'
  );
  assert(
    polluted.ok === true &&
      !Object.prototype.hasOwnProperty.call(polluted.value, "__proto__") &&
      !Object.prototype.hasOwnProperty.call(polluted.value, "constructor") &&
      polluted.value.ok === 1 &&
      !Object.prototype.hasOwnProperty.call(Object.prototype, "polluted"),
    "23. prototype pollution JSON sanitized"
  );

  const blocks = [
    block({
      sectionId: "sec-hero",
      contentGroup: "cg-hero",
      componentType: "hero",
      optionsJson:
        '{"safe":true,"__proto__":{"polluted":true},"prototype":{"y":1}}',
    }),
  ];
  const contents = [
    content({
      contentGroup: "cg-hero",
      itemId: "h1",
      role: "root",
      title: "H",
      extraJson: '{"a":1,"constructor":{"prototype":{"z":1}}}',
    }),
  ];
  const result = validateV2Page({ ...SCOPE, blocks, contents });
  assert(
    result.ok === true &&
      result.page.blocks[0].options.safe === true &&
      !Object.prototype.hasOwnProperty.call(
        result.page.blocks[0].options,
        "constructor"
      ) &&
      !Object.prototype.hasOwnProperty.call(
        result.page.blocks[0].options,
        "__proto__"
      ) &&
      !Object.prototype.hasOwnProperty.call(
        result.page.blocks[0].items[0].extra,
        "constructor"
      ) &&
      !Object.prototype.hasOwnProperty.call(
        result.page.blocks[0].items[0].extra,
        "prototype"
      ) &&
      result.page.blocks[0].items[0].extra.a === 1,
    "23b. options/extra pollution keys stripped in page model"
  );
}

// 24. sectionOrder / itemOrder sort
{
  const blocks = [
    block({
      sectionId: "sec-b",
      contentGroup: "cg-b",
      componentType: "form",
      sectionOrder: 20,
    }),
    block({
      sectionId: "sec-a",
      contentGroup: "cg-a",
      componentType: "hero",
      sectionOrder: 10,
    }),
  ];
  const contents = [
    content({
      contentGroup: "cg-a",
      itemId: "h1",
      role: "root",
      title: "H",
    }),
    content({
      contentGroup: "cg-b",
      itemId: "f1",
      role: "form",
    }),
  ];
  const result = validateV2Page({ ...SCOPE, blocks, contents });
  assert(
    result.ok === true &&
      result.page.blocks.map((b) => b.sectionId).join(",") === "sec-a,sec-b",
    "24. sectionOrder/itemOrder sorting"
  );
}

// 25. input arrays not mutated
{
  const blocks = [
    block({
      sectionId: "sec-hero",
      contentGroup: "cg-hero",
      componentType: "hero",
      variant: "split",
      backgroundType: "video",
    }),
  ];
  const contents = [
    content({
      contentGroup: "cg-hero",
      itemId: "h1",
      role: "root",
      title: "  Hello  ",
      extraJson: "{bad",
    }),
  ];
  const blocksBefore = JSON.stringify(blocks);
  const contentsBefore = JSON.stringify(contents);
  validateV2Page({ ...SCOPE, blocks, contents });
  assert(
    JSON.stringify(blocks) === blocksBefore &&
      JSON.stringify(contents) === contentsBefore,
    "25. input arrays not mutated"
  );
}

console.log(`\n[verify:v2-schema] ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
