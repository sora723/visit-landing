/**
 * V2 블록·콘텐츠 행 정규화.
 * 입력 배열·객체를 직접 변경하지 않는다.
 */

import {
  getComponentRegistryEntry,
  isKnownComponentType,
} from "./component-registry";
import { parseSafeJsonObject } from "./safe-json";
import type {
  NormalizedV2Block,
  NormalizedV2Content,
  V2BackgroundType,
  V2BlockRow,
  V2ContentRow,
  V2Warning,
} from "./types";

export function trimString(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

/** V1 sheet parseBool과 동일 계열 (Y/TRUE/1/YES) */
export function normalizeSheetBool(
  value: unknown,
  defaultValue: boolean
): boolean {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;
  const v = String(value).trim().toUpperCase();
  if (v === "Y" || v === "TRUE" || v === "1" || v === "YES") return true;
  if (v === "N" || v === "FALSE" || v === "0" || v === "NO") return false;
  return defaultValue;
}

export function normalizeOrder(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const n = Number(String(value ?? "").trim());
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeBackgroundType(value: unknown): V2BackgroundType {
  const v = trimString(value).toLowerCase();
  if (v === "color" || v === "image" || v === "none") return v;
  return "none";
}

function optionalTrimmed(value: unknown): string | undefined {
  const s = trimString(value);
  return s ? s : undefined;
}

export type NormalizeV2RowsResult = {
  blocks: NormalizedV2Block[];
  contents: NormalizedV2Content[];
  warnings: V2Warning[];
};

/**
 * 원시 행 → 정규화 행. disabled·알 수 없는 componentType은 제외.
 * siteCode/revisionId 스코프 필터는 validate 단계에서 수행.
 */
export function normalizeV2Rows(
  blocksInput: readonly V2BlockRow[],
  contentsInput: readonly V2ContentRow[]
): NormalizeV2RowsResult {
  const warnings: V2Warning[] = [];
  const blocks: NormalizedV2Block[] = [];
  const contents: NormalizedV2Content[] = [];

  blocksInput.forEach((row, sourceIndex) => {
    const enabled = normalizeSheetBool(row.enabled, true);
    if (!enabled) {
      warnings.push({
        code: "block_disabled",
        message: "disabled block excluded",
        sectionId: trimString(row.sectionId) || undefined,
      });
      return;
    }

    const componentType = trimString(row.componentType);
    if (!isKnownComponentType(componentType)) {
      warnings.push({
        code: "unknown_component_type",
        message: `unknown componentType excluded: ${componentType || "(empty)"}`,
        sectionId: trimString(row.sectionId) || undefined,
      });
      return;
    }

    const registry = getComponentRegistryEntry(componentType)!;
    let variant = trimString(row.variant);
    if (!registry.variants.includes(variant)) {
      warnings.push({
        code: "invalid_variant",
        message: `variant "${variant}" → default "${registry.defaultVariant}"`,
        sectionId: trimString(row.sectionId) || undefined,
      });
      variant = registry.defaultVariant;
    }

    const optionsParsed = parseSafeJsonObject(row.optionsJson);
    let options: Record<string, unknown>;
    if (!optionsParsed.ok) {
      warnings.push({
        code: "options_json_error",
        message: `optionsJson parse failed (${optionsParsed.reason}); using defaults`,
        sectionId: trimString(row.sectionId) || undefined,
      });
      options = { ...registry.defaultOptions };
    } else {
      options = {
        ...registry.defaultOptions,
        ...optionsParsed.value,
      };
    }

    const rawBackgroundType = trimString(row.backgroundType);
    const backgroundType = normalizeBackgroundType(row.backgroundType);
    if (
      rawBackgroundType &&
      rawBackgroundType.toLowerCase() !== backgroundType
    ) {
      warnings.push({
        code: "invalid_background_type",
        message: `backgroundType "${rawBackgroundType}" → none`,
        sectionId: trimString(row.sectionId) || undefined,
      });
    }

    blocks.push({
      siteCode: trimString(row.siteCode),
      revisionId: trimString(row.revisionId),
      sectionId: trimString(row.sectionId),
      sectionOrder: normalizeOrder(row.sectionOrder, sourceIndex),
      componentType,
      variant,
      contentGroup: trimString(row.contentGroup),
      enabled: true,
      desktopVisible: normalizeSheetBool(row.desktopVisible, true),
      mobileVisible: normalizeSheetBool(row.mobileVisible, true),
      backgroundType,
      backgroundColor: optionalTrimmed(row.backgroundColor),
      backgroundPc: optionalTrimmed(row.backgroundPc),
      backgroundMobile: optionalTrimmed(row.backgroundMobile),
      themeVariant: optionalTrimmed(row.themeVariant),
      paddingPreset: optionalTrimmed(row.paddingPreset),
      animationPreset: optionalTrimmed(row.animationPreset),
      options,
      sourceIndex,
    });
  });

  contentsInput.forEach((row, sourceIndex) => {
    const enabled = normalizeSheetBool(row.enabled, true);
    if (!enabled) {
      warnings.push({
        code: "content_disabled",
        message: "disabled content item excluded",
        itemId: trimString(row.itemId) || undefined,
        contentGroup: trimString(row.contentGroup) || undefined,
      });
      return;
    }

    const extraParsed = parseSafeJsonObject(row.extraJson);
    let extra: Record<string, unknown>;
    if (!extraParsed.ok) {
      warnings.push({
        code: "extra_json_error",
        message: `extraJson parse failed (${extraParsed.reason}); using {}`,
        itemId: trimString(row.itemId) || undefined,
        contentGroup: trimString(row.contentGroup) || undefined,
      });
      extra = {};
    } else {
      extra = extraParsed.value;
    }

    contents.push({
      siteCode: trimString(row.siteCode),
      revisionId: trimString(row.revisionId),
      contentGroup: trimString(row.contentGroup),
      itemId: trimString(row.itemId),
      itemOrder: normalizeOrder(row.itemOrder, sourceIndex),
      role: trimString(row.role),
      eyebrow: optionalTrimmed(row.eyebrow),
      title: optionalTrimmed(row.title),
      subtitle: optionalTrimmed(row.subtitle),
      description: optionalTrimmed(row.description),
      value: optionalTrimmed(row.value),
      badge: optionalTrimmed(row.badge),
      icon: optionalTrimmed(row.icon),
      imagePc: optionalTrimmed(row.imagePc),
      imageMobile: optionalTrimmed(row.imageMobile),
      videoUrl: optionalTrimmed(row.videoUrl),
      actionType: optionalTrimmed(row.actionType),
      actionLabel: optionalTrimmed(row.actionLabel),
      actionValue: optionalTrimmed(row.actionValue),
      extra,
      enabled: true,
      sourceIndex,
    });
  });

  return { blocks, contents, warnings };
}
