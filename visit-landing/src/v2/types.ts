/**
 * V2 시트 행·검증 결과 계약.
 * 컬럼명은 docs/V2_SHEET_STRUCTURE.md §7 및 설계 컬럼 목록과 맞춤.
 * Sheet I/O·렌더러는 포함하지 않음.
 */

/** 지원 pageSchemaVersion (현장관리). 그 외는 fatal. */
export const SUPPORTED_PAGE_SCHEMA_VERSIONS = ["1"] as const;

export type V2BackgroundType = "none" | "color" | "image";

/** V2_블록관리 1행 (원시/정규화 전 입력 가능 형태) */
export type V2BlockRow = {
  siteCode: string;
  revisionId: string;
  sectionId: string;
  sectionOrder: number | string;
  componentType: string;
  variant: string;
  contentGroup: string;
  enabled: boolean | string;
  desktopVisible: boolean | string;
  mobileVisible: boolean | string;
  backgroundType: string;
  /** HEX 등 — 문서 §7 한 줄 요약에는 명시되지 않음. 색상 배경용으로 유지(보고 대상). */
  backgroundColor?: string;
  backgroundPc: string;
  backgroundMobile: string;
  themeVariant: string;
  paddingPreset: string;
  animationPreset: string;
  optionsJson: string | Record<string, unknown> | null | undefined;
};

/** V2_콘텐츠 1행 */
export type V2ContentRow = {
  siteCode: string;
  revisionId: string;
  contentGroup: string;
  itemId: string;
  itemOrder: number | string;
  role: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  description: string;
  value: string;
  badge: string;
  icon: string;
  imagePc: string;
  imageMobile: string;
  videoUrl: string;
  actionType: string;
  actionLabel: string;
  actionValue: string;
  extraJson: string | Record<string, unknown> | null | undefined;
  enabled: boolean | string;
};

export type V2Warning = {
  code: string;
  message: string;
  sectionId?: string;
  contentGroup?: string;
  itemId?: string;
};

export type V2FatalError = {
  code: string;
  message: string;
};

/** 정규화된 콘텐츠 아이템 (렌더러 전달용 — 알 수 없는 필드 없음) */
export type ValidatedV2ContentItem = {
  itemId: string;
  order: number;
  role: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  value?: string;
  badge?: string;
  icon?: string;
  imagePc?: string;
  imageMobile?: string;
  videoUrl?: string;
  actionType?: string;
  actionLabel?: string;
  actionValue?: string;
  extra: Record<string, unknown>;
};

export type ValidatedV2BlockLayout = {
  desktopVisible: boolean;
  mobileVisible: boolean;
  backgroundType: V2BackgroundType;
  backgroundColor?: string;
  backgroundPc?: string;
  backgroundMobile?: string;
  themeVariant?: string;
  paddingPreset?: string;
  animationPreset?: string;
};

export type ValidatedV2Block = {
  sectionId: string;
  order: number;
  componentType: string;
  variant: string;
  contentGroup: string;
  layout: ValidatedV2BlockLayout;
  items: ValidatedV2ContentItem[];
  options: Record<string, unknown>;
};

export type ValidatedV2Page = {
  siteCode: string;
  revisionId: string;
  pageSchemaVersion: string;
  blocks: ValidatedV2Block[];
  overlays: ValidatedV2Block[];
  warnings: V2Warning[];
};

export type ValidateV2PageInput = {
  siteCode: string;
  revisionId: string;
  pageSchemaVersion: string | number | null | undefined;
  blocks: readonly V2BlockRow[];
  contents: readonly V2ContentRow[];
};

export type ValidateV2PageResult =
  | {
      ok: true;
      page: ValidatedV2Page;
      warnings: V2Warning[];
    }
  | {
      ok: false;
      fatalErrors: V2FatalError[];
      warnings: V2Warning[];
    };

/** 정규화 직후 내부용 블록 */
export type NormalizedV2Block = {
  siteCode: string;
  revisionId: string;
  sectionId: string;
  sectionOrder: number;
  componentType: string;
  variant: string;
  contentGroup: string;
  enabled: boolean;
  desktopVisible: boolean;
  mobileVisible: boolean;
  backgroundType: V2BackgroundType;
  backgroundColor?: string;
  backgroundPc?: string;
  backgroundMobile?: string;
  themeVariant?: string;
  paddingPreset?: string;
  animationPreset?: string;
  options: Record<string, unknown>;
  /** 원본 배열에서의 상대 순서 (후순위 판정) */
  sourceIndex: number;
};

export type NormalizedV2Content = {
  siteCode: string;
  revisionId: string;
  contentGroup: string;
  itemId: string;
  itemOrder: number;
  role: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  value?: string;
  badge?: string;
  icon?: string;
  imagePc?: string;
  imageMobile?: string;
  videoUrl?: string;
  actionType?: string;
  actionLabel?: string;
  actionValue?: string;
  extra: Record<string, unknown>;
  enabled: boolean;
  sourceIndex: number;
};
