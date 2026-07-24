/**
 * V2 페이지 검증 엔진.
 * Sheet·렌더러·네트워크 없음. fixture/정규화 행만 처리.
 */

import {
  getComponentRegistryEntry,
  type ComponentRegistryEntry,
  type RoleFieldRequirement,
} from "./component-registry";
import { normalizeV2Rows } from "./normalize-v2-data";
import { filterAllowedKeys } from "./safe-json";
import type {
  NormalizedV2Block,
  NormalizedV2Content,
  ValidateV2PageInput,
  ValidateV2PageResult,
  ValidatedV2Block,
  ValidatedV2ContentItem,
  ValidatedV2Page,
  V2FatalError,
  V2Warning,
} from "./types";
import { SUPPORTED_PAGE_SCHEMA_VERSIONS as SUPPORTED } from "./types";

function normalizeSchemaVersion(
  value: string | number | null | undefined
): string {
  if (value == null) return "";
  return String(value).trim();
}

function isSupportedSchemaVersion(version: string): boolean {
  return (SUPPORTED as readonly string[]).includes(version);
}

function fieldPresent(item: NormalizedV2Content, field: string): boolean {
  const v = (item as Record<string, unknown>)[field];
  return typeof v === "string" ? v.length > 0 : v != null && v !== "";
}

function meetsFieldRequirement(
  item: NormalizedV2Content,
  req: RoleFieldRequirement
): boolean {
  if ("allOf" in req) {
    return req.allOf.every((f) => fieldPresent(item, f));
  }
  return req.anyOf.some((f) => fieldPresent(item, f));
}

function toValidatedItem(item: NormalizedV2Content): ValidatedV2ContentItem {
  return {
    itemId: item.itemId,
    order: item.itemOrder,
    role: item.role,
    ...(item.eyebrow ? { eyebrow: item.eyebrow } : {}),
    ...(item.title ? { title: item.title } : {}),
    ...(item.subtitle ? { subtitle: item.subtitle } : {}),
    ...(item.description ? { description: item.description } : {}),
    ...(item.value ? { value: item.value } : {}),
    ...(item.badge ? { badge: item.badge } : {}),
    ...(item.icon ? { icon: item.icon } : {}),
    ...(item.imagePc ? { imagePc: item.imagePc } : {}),
    ...(item.imageMobile ? { imageMobile: item.imageMobile } : {}),
    ...(item.videoUrl ? { videoUrl: item.videoUrl } : {}),
    ...(item.actionType ? { actionType: item.actionType } : {}),
    ...(item.actionLabel ? { actionLabel: item.actionLabel } : {}),
    ...(item.actionValue ? { actionValue: item.actionValue } : {}),
    extra: { ...item.extra },
  };
}

function toValidatedBlock(
  block: NormalizedV2Block,
  items: ValidatedV2ContentItem[]
): ValidatedV2Block {
  return {
    sectionId: block.sectionId,
    order: block.sectionOrder,
    componentType: block.componentType,
    variant: block.variant,
    contentGroup: block.contentGroup,
    layout: {
      desktopVisible: block.desktopVisible,
      mobileVisible: block.mobileVisible,
      backgroundType: block.backgroundType,
      ...(block.backgroundColor
        ? { backgroundColor: block.backgroundColor }
        : {}),
      ...(block.backgroundPc ? { backgroundPc: block.backgroundPc } : {}),
      ...(block.backgroundMobile
        ? { backgroundMobile: block.backgroundMobile }
        : {}),
      ...(block.themeVariant ? { themeVariant: block.themeVariant } : {}),
      ...(block.paddingPreset ? { paddingPreset: block.paddingPreset } : {}),
      ...(block.animationPreset
        ? { animationPreset: block.animationPreset }
        : {}),
    },
    items,
    options: { ...block.options },
  };
}

/**
 * hero.video / media.background-video 필수.
 * 유지된 아이템: videoUrl + imagePc + imageMobile
 * options: muted/autoplay/loop/playsinline 모두 === true
 * (poster·mobileFallback·videoUrl 은 options 금지 — 콘텐츠 컬럼만)
 */
function videoVariantReady(
  block: NormalizedV2Block,
  keptItems: readonly NormalizedV2Content[],
  registry: ComponentRegistryEntry
): boolean {
  if (!registry.allowsVideo) return true;
  if (block.variant !== "video" && block.variant !== "background-video") {
    return true;
  }
  const opts = block.options;
  const flags = ["muted", "autoplay", "loop", "playsinline"] as const;
  for (const key of flags) {
    if (opts[key] !== true) return false;
  }

  const hasVideoUrl = keptItems.some((i) => Boolean(i.videoUrl));
  const hasImagePc = keptItems.some((i) => Boolean(i.imagePc));
  const hasImageMobile = keptItems.some((i) => Boolean(i.imageMobile));
  return hasVideoUrl && hasImagePc && hasImageMobile;
}

function validatePopupVariantRoles(
  variant: string,
  items: NormalizedV2Content[]
): boolean {
  const hasImage = items.some(
    (i) => i.role === "image" && (i.imagePc || i.imageMobile)
  );
  const hasForm = items.some((i) => i.role === "form");
  if (variant === "image") return hasImage;
  if (variant === "form") return hasForm;
  if (variant === "imageForm") return hasImage && hasForm;
  return false;
}

function mediaHasRequiredContent(
  block: NormalizedV2Block,
  items: NormalizedV2Content[]
): boolean {
  if (block.variant === "video" || block.variant === "background-video") {
    return items.some((i) => Boolean(i.videoUrl));
  }
  return items.some(
    (i) =>
      (i.role === "image" || i.role === "slide" || i.role === "root") &&
      (i.imagePc || i.imageMobile || i.videoUrl)
  );
}

type FilterItemsResult = {
  kept: NormalizedV2Content[];
  validated: ValidatedV2ContentItem[];
};

function filterAndValidateItems(
  block: NormalizedV2Block,
  registry: ComponentRegistryEntry,
  groupItems: NormalizedV2Content[],
  warnings: V2Warning[]
): FilterItemsResult {
  const sorted = [...groupItems].sort((a, b) => {
    if (a.itemOrder !== b.itemOrder) return a.itemOrder - b.itemOrder;
    return a.sourceIndex - b.sourceIndex;
  });

  const seenIds = new Set<string>();
  const kept: NormalizedV2Content[] = [];

  for (const item of sorted) {
    if (!item.itemId) {
      warnings.push({
        code: "item_missing_id",
        message: "content item missing itemId; excluded",
        sectionId: block.sectionId,
        contentGroup: block.contentGroup,
      });
      continue;
    }
    if (seenIds.has(item.itemId)) {
      warnings.push({
        code: "duplicate_item_id",
        message: `duplicate itemId "${item.itemId}"; later item excluded`,
        sectionId: block.sectionId,
        contentGroup: block.contentGroup,
        itemId: item.itemId,
      });
      continue;
    }
    if (!registry.allowedRoles.includes(item.role)) {
      warnings.push({
        code: "disallowed_role",
        message: `role "${item.role}" not allowed for ${block.componentType}; item excluded`,
        sectionId: block.sectionId,
        contentGroup: block.contentGroup,
        itemId: item.itemId,
      });
      continue;
    }

    const req = registry.roleFieldRequirements[item.role];
    if (req && !meetsFieldRequirement(item, req)) {
      warnings.push({
        code: "item_missing_required_fields",
        message: `item "${item.itemId}" role=${item.role} missing required fields; excluded`,
        sectionId: block.sectionId,
        contentGroup: block.contentGroup,
        itemId: item.itemId,
      });
      continue;
    }

    const allowedExtra =
      registry.allowedExtraKeysByRole[item.role] ?? [];
    const filteredExtra = filterAllowedKeys(item.extra, allowedExtra);
    if (filteredExtra.removedKeys.length > 0) {
      warnings.push({
        code: "unknown_extra_key",
        message: `extra keys removed on "${item.itemId}": ${filteredExtra.removedKeys.join(", ")}`,
        sectionId: block.sectionId,
        contentGroup: block.contentGroup,
        itemId: item.itemId,
      });
    }

    seenIds.add(item.itemId);
    kept.push({ ...item, extra: filteredExtra.value });
  }

  // maxItems: 초과 아이템만 제외 (블록 전체 제외하지 않음)
  let trimmed = kept;
  if (kept.length > registry.maxItems) {
    const overflow = kept.slice(registry.maxItems);
    trimmed = kept.slice(0, registry.maxItems);
    warnings.push({
      code: "max_items_exceeded",
      message: `${block.componentType} maxItems=${registry.maxItems}; dropped ${overflow.length} item(s)`,
      sectionId: block.sectionId,
      contentGroup: block.contentGroup,
    });
  }

  return {
    kept: trimmed,
    validated: trimmed.map(toValidatedItem),
  };
}

function blockMeetsRequiredRoles(
  registry: ComponentRegistryEntry,
  items: ValidatedV2ContentItem[]
): boolean {
  for (const req of registry.requiredRoles) {
    const count = items.filter((i) => i.role === req.role).length;
    if (count < req.min) return false;
  }
  if (items.length < registry.minItems) return false;
  return true;
}

/**
 * siteCode + revisionId 범위의 블록·콘텐츠를 검증해 렌더러용 모델을 반환한다.
 * 입력 배열을 변경하지 않는다.
 */
export function validateV2Page(
  input: ValidateV2PageInput
): ValidateV2PageResult {
  const warnings: V2Warning[] = [];
  const fatalErrors: V2FatalError[] = [];

  const siteCode = String(input.siteCode ?? "").trim();
  const revisionId = String(input.revisionId ?? "").trim();
  const pageSchemaVersion = normalizeSchemaVersion(input.pageSchemaVersion);

  if (!siteCode || !revisionId) {
    fatalErrors.push({
      code: "missing_scope",
      message: "siteCode and revisionId are required",
    });
    return { ok: false, fatalErrors, warnings };
  }

  if (!isSupportedSchemaVersion(pageSchemaVersion)) {
    fatalErrors.push({
      code: "unsupported_page_schema_version",
      message: `unsupported pageSchemaVersion: ${pageSchemaVersion || "(empty)"}`,
    });
    return { ok: false, fatalErrors, warnings };
  }

  const blocksSnapshot = input.blocks.slice();
  const contentsSnapshot = input.contents.slice();
  const normalized = normalizeV2Rows(blocksSnapshot, contentsSnapshot);
  warnings.push(...normalized.warnings);

  const scopedBlocks = normalized.blocks.filter(
    (b) => b.siteCode === siteCode && b.revisionId === revisionId
  );
  const scopedContents = normalized.contents.filter(
    (c) => c.siteCode === siteCode && c.revisionId === revisionId
  );

  const foreignBlocks = normalized.blocks.length - scopedBlocks.length;
  const foreignContents = normalized.contents.length - scopedContents.length;
  if (foreignBlocks > 0) {
    warnings.push({
      code: "foreign_block_scope",
      message: `${foreignBlocks} block row(s) outside siteCode/revisionId excluded`,
    });
  }
  if (foreignContents > 0) {
    warnings.push({
      code: "foreign_content_scope",
      message: `${foreignContents} content row(s) outside siteCode/revisionId excluded`,
    });
  }

  const bySource = [...scopedBlocks].sort(
    (a, b) => a.sourceIndex - b.sourceIndex
  );
  const seenSectionIds = new Set<string>();
  const seenContentGroups = new Set<string>();
  const uniqueBlocks: NormalizedV2Block[] = [];

  for (const block of bySource) {
    if (!block.sectionId || !block.contentGroup) {
      warnings.push({
        code: "block_missing_keys",
        message: "block missing sectionId or contentGroup; excluded",
        sectionId: block.sectionId || undefined,
        contentGroup: block.contentGroup || undefined,
      });
      continue;
    }
    if (seenSectionIds.has(block.sectionId)) {
      warnings.push({
        code: "duplicate_section_id",
        message: `duplicate sectionId "${block.sectionId}"; later block excluded`,
        sectionId: block.sectionId,
      });
      continue;
    }
    if (seenContentGroups.has(block.contentGroup)) {
      warnings.push({
        code: "duplicate_content_group",
        message: `duplicate contentGroup "${block.contentGroup}"; later block excluded`,
        sectionId: block.sectionId,
        contentGroup: block.contentGroup,
      });
      continue;
    }
    seenSectionIds.add(block.sectionId);
    seenContentGroups.add(block.contentGroup);
    uniqueBlocks.push(block);
  }

  uniqueBlocks.sort((a, b) => {
    if (a.sectionOrder !== b.sectionOrder) return a.sectionOrder - b.sectionOrder;
    return a.sourceIndex - b.sourceIndex;
  });

  const contentsByGroup = new Map<string, NormalizedV2Content[]>();
  for (const item of scopedContents) {
    const list = contentsByGroup.get(item.contentGroup) ?? [];
    list.push(item);
    contentsByGroup.set(item.contentGroup, list);
  }

  const documentBlocks: ValidatedV2Block[] = [];
  const overlayBlocks: ValidatedV2Block[] = [];
  const overlayCounts = new Map<string, number>();

  for (const block of uniqueBlocks) {
    const registry = getComponentRegistryEntry(block.componentType);
    if (!registry) {
      warnings.push({
        code: "unknown_component_type",
        message: `unknown componentType "${block.componentType}"; excluded`,
        sectionId: block.sectionId,
      });
      continue;
    }

    const groupItems = contentsByGroup.get(block.contentGroup) ?? [];
    const { kept, validated: validatedItems } = filterAndValidateItems(
      block,
      registry,
      groupItems,
      warnings
    );

    let working = block;
    if (!videoVariantReady(working, kept, registry)) {
      if (
        working.variant === "video" ||
        working.variant === "background-video"
      ) {
        warnings.push({
          code: "video_variant_incomplete",
          message: `video variant incomplete; using default "${registry.defaultVariant}"`,
          sectionId: block.sectionId,
        });
        working = { ...working, variant: registry.defaultVariant };
      }
    }

    if (working.componentType === "media") {
      if (!mediaHasRequiredContent(working, kept)) {
        warnings.push({
          code: "media_missing_assets",
          message: "media block missing image/video assets; excluded",
          sectionId: working.sectionId,
        });
        continue;
      }
    }

    if (working.componentType === "popup") {
      if (!validatePopupVariantRoles(working.variant, kept)) {
        warnings.push({
          code: "popup_variant_unmet",
          message: `popup variant "${working.variant}" requirements unmet; excluded`,
          sectionId: working.sectionId,
        });
        continue;
      }
    }

    if (!blockMeetsRequiredRoles(registry, validatedItems)) {
      warnings.push({
        code: "block_missing_required_content",
        message: `block "${working.sectionId}" missing required roles/fields; excluded`,
        sectionId: working.sectionId,
        contentGroup: working.contentGroup,
      });
      continue;
    }

    if (registry.isOverlay) {
      const count = overlayCounts.get(working.componentType) ?? 0;
      if (count >= registry.maxPerPage) {
        warnings.push({
          code: "overlay_max_exceeded",
          message: `${working.componentType} max ${registry.maxPerPage} exceeded; later excluded`,
          sectionId: working.sectionId,
        });
        continue;
      }
      overlayCounts.set(working.componentType, count + 1);
      overlayBlocks.push(toValidatedBlock(working, validatedItems));
    } else {
      documentBlocks.push(toValidatedBlock(working, validatedItems));
    }
  }

  const substantiveCount = documentBlocks.filter((b) => {
    const entry = getComponentRegistryEntry(b.componentType);
    return entry?.contributesToPageValidity === true;
  }).length;

  if (substantiveCount === 0) {
    fatalErrors.push({
      code: "no_valid_document_blocks",
      message:
        "no substantive content blocks (footerInfo/liveFeed/overlay alone are insufficient)",
    });
    return { ok: false, fatalErrors, warnings };
  }

  const page: ValidatedV2Page = {
    siteCode,
    revisionId,
    pageSchemaVersion,
    blocks: documentBlocks,
    overlays: overlayBlocks,
    warnings: [...warnings],
  };

  return { ok: true, page, warnings };
}
