/**
 * V2 데이터 계약 · 레지스트리 · 검증 (Sheet/렌더러 미포함).
 */

export {
  COMPONENT_REGISTRY,
  FORBIDDEN_JSON_KEYS,
  RESERVED_MEDIA_OPTION_KEYS,
  VIDEO_OPTION_KEYS,
  getComponentRegistryEntry,
  isKnownComponentType,
  type ComponentRegistryEntry,
  type RoleFieldRequirement,
} from "./component-registry";

export {
  normalizeBackgroundType,
  normalizeOrder,
  normalizeSheetBool,
  normalizeV2Rows,
  pickBackgroundFields,
  trimString,
  type NormalizeV2RowsResult,
} from "./normalize-v2-data";

export {
  filterAllowedKeys,
  parseSafeJsonObject,
  sanitizePlainObject,
} from "./safe-json";

export { validateV2Page } from "./validate-v2-page";

export {
  SUPPORTED_PAGE_SCHEMA_VERSIONS,
  type NormalizedV2Block,
  type NormalizedV2Content,
  type ValidateV2PageInput,
  type ValidateV2PageResult,
  type ValidatedV2Block,
  type ValidatedV2ContentItem,
  type ValidatedV2Page,
  type V2BackgroundType,
  type V2BlockRow,
  type V2ContentRow,
  type V2FatalError,
  type V2Warning,
} from "./types";
