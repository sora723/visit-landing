/**
 * V2 componentType 레지스트리.
 * docs/V2_SHEET_STRUCTURE.md §10 기준.
 * customHtml 미등록·금지.
 */

export type RoleFieldRequirement =
  | { allOf: readonly string[] }
  | { anyOf: readonly string[] };

export type ComponentRegistryEntry = {
  componentType: string;
  variants: readonly string[];
  defaultVariant: string;
  allowedRoles: readonly string[];
  /** 블록에 반드시 있어야 하는 role (개수) */
  requiredRoles: readonly { role: string; min: number }[];
  /** role별 필수 필드 */
  roleFieldRequirements: Readonly<Record<string, RoleFieldRequirement>>;
  /** role=root 아이템 필수 필드 (요약 — roleFieldRequirements.root와 동기) */
  requiredRootFields: readonly string[];
  /** role=item 아이템 필수 필드 */
  requiredItemFields: readonly string[];
  minItems: number;
  maxItems: number;
  isOverlay: boolean;
  maxPerPage: number;
  allowsVideo: boolean;
  defaultOptions: Readonly<Record<string, unknown>>;
};

function entry(
  partial: Omit<ComponentRegistryEntry, "requiredRootFields" | "requiredItemFields"> & {
    requiredRootFields?: readonly string[];
    requiredItemFields?: readonly string[];
  }
): ComponentRegistryEntry {
  return {
    requiredRootFields: partial.requiredRootFields ?? [],
    requiredItemFields: partial.requiredItemFields ?? [],
    ...partial,
  };
}

/**
 * §10 Document 요약 + Overlay 명시 variant만 등록.
 * 문서에 없는 variant(예: hero.split)는 넣지 않음.
 */
export const COMPONENT_REGISTRY: Readonly<
  Record<string, ComponentRegistryEntry>
> = {
  hero: entry({
    componentType: "hero",
    variants: ["fullBleed", "video"],
    defaultVariant: "fullBleed",
    allowedRoles: ["root", "cta", "stat", "item"],
    requiredRoles: [{ role: "root", min: 1 }],
    roleFieldRequirements: {
      root: { allOf: ["title"] },
      cta: { allOf: ["actionLabel", "actionType"] },
      stat: { anyOf: ["title", "value"] },
      item: { anyOf: ["title", "value"] },
    },
    requiredRootFields: ["title"],
    requiredItemFields: [],
    minItems: 1,
    maxItems: 20,
    isOverlay: false,
    maxPerPage: Number.POSITIVE_INFINITY,
    allowsVideo: true,
    defaultOptions: {},
  }),
  notice: entry({
    componentType: "notice",
    variants: ["banner"],
    defaultVariant: "banner",
    allowedRoles: ["root"],
    requiredRoles: [{ role: "root", min: 1 }],
    roleFieldRequirements: {
      root: { anyOf: ["title", "description"] },
    },
    requiredRootFields: [],
    requiredItemFields: [],
    minItems: 1,
    maxItems: 5,
    isOverlay: false,
    maxPerPage: Number.POSITIVE_INFINITY,
    allowsVideo: false,
    defaultOptions: {},
  }),
  liveFeed: entry({
    componentType: "liveFeed",
    variants: ["default"],
    defaultVariant: "default",
    allowedRoles: ["root"],
    requiredRoles: [],
    roleFieldRequirements: {},
    requiredRootFields: [],
    requiredItemFields: [],
    minItems: 0,
    maxItems: 5,
    isOverlay: false,
    maxPerPage: Number.POSITIVE_INFINITY,
    allowsVideo: false,
    defaultOptions: {},
  }),
  richText: entry({
    componentType: "richText",
    variants: ["left"],
    defaultVariant: "left",
    allowedRoles: ["root"],
    requiredRoles: [{ role: "root", min: 1 }],
    roleFieldRequirements: {
      root: { anyOf: ["title", "description"] },
    },
    requiredRootFields: [],
    requiredItemFields: [],
    minItems: 1,
    maxItems: 5,
    isOverlay: false,
    maxPerPage: Number.POSITIVE_INFINITY,
    allowsVideo: false,
    defaultOptions: {},
  }),
  featureCards: entry({
    componentType: "featureCards",
    variants: ["grid3"],
    defaultVariant: "grid3",
    allowedRoles: ["root", "item"],
    requiredRoles: [{ role: "item", min: 1 }],
    roleFieldRequirements: {
      item: { allOf: ["title"] },
    },
    requiredRootFields: [],
    requiredItemFields: ["title"],
    minItems: 1,
    maxItems: 24,
    isOverlay: false,
    maxPerPage: Number.POSITIVE_INFINITY,
    allowsVideo: false,
    defaultOptions: {},
  }),
  media: entry({
    componentType: "media",
    variants: ["single", "gallery", "video", "background-video"],
    defaultVariant: "single",
    allowedRoles: ["root", "image", "slide"],
    requiredRoles: [],
    roleFieldRequirements: {
      image: { anyOf: ["imagePc", "imageMobile"] },
      slide: { anyOf: ["imagePc", "imageMobile"] },
    },
    requiredRootFields: [],
    requiredItemFields: [],
    minItems: 0,
    maxItems: 30,
    isOverlay: false,
    maxPerPage: Number.POSITIVE_INFINITY,
    allowsVideo: true,
    defaultOptions: {},
  }),
  location: entry({
    componentType: "location",
    variants: ["mapImage"],
    defaultVariant: "mapImage",
    allowedRoles: ["root", "item", "image"],
    requiredRoles: [{ role: "root", min: 1 }],
    roleFieldRequirements: {
      root: { anyOf: ["title", "description"] },
      item: { anyOf: ["title", "description"] },
      image: { anyOf: ["imagePc", "imageMobile"] },
    },
    requiredRootFields: [],
    requiredItemFields: [],
    minItems: 1,
    maxItems: 30,
    isOverlay: false,
    maxPerPage: Number.POSITIVE_INFINITY,
    allowsVideo: false,
    defaultOptions: {},
  }),
  form: entry({
    componentType: "form",
    variants: ["card"],
    defaultVariant: "card",
    allowedRoles: ["root", "form", "cta"],
    requiredRoles: [{ role: "form", min: 1 }],
    roleFieldRequirements: {
      cta: { allOf: ["actionLabel", "actionType"] },
    },
    requiredRootFields: [],
    requiredItemFields: [],
    minItems: 1,
    maxItems: 10,
    isOverlay: false,
    maxPerPage: Number.POSITIVE_INFINITY,
    allowsVideo: false,
    defaultOptions: {},
  }),
  ctaBand: entry({
    componentType: "ctaBand",
    variants: ["dark"],
    defaultVariant: "dark",
    allowedRoles: ["root", "cta"],
    requiredRoles: [
      { role: "root", min: 1 },
      { role: "cta", min: 1 },
    ],
    roleFieldRequirements: {
      root: { anyOf: ["title", "description"] },
      cta: { allOf: ["actionLabel", "actionType"] },
    },
    requiredRootFields: [],
    requiredItemFields: [],
    minItems: 2,
    maxItems: 10,
    isOverlay: false,
    maxPerPage: Number.POSITIVE_INFINITY,
    allowsVideo: false,
    defaultOptions: {},
  }),
  footerInfo: entry({
    componentType: "footerInfo",
    variants: ["default"],
    defaultVariant: "default",
    allowedRoles: ["root", "item"],
    requiredRoles: [],
    roleFieldRequirements: {
      item: { allOf: ["title", "description"] },
    },
    requiredRootFields: [],
    requiredItemFields: ["title", "description"],
    minItems: 0,
    maxItems: 20,
    isOverlay: false,
    maxPerPage: Number.POSITIVE_INFINITY,
    allowsVideo: false,
    defaultOptions: {},
  }),
  stickyPromo: entry({
    componentType: "stickyPromo",
    variants: ["default", "compact"],
    defaultVariant: "default",
    allowedRoles: ["root", "cta"],
    requiredRoles: [{ role: "root", min: 1 }],
    roleFieldRequirements: {
      root: { anyOf: ["title", "description"] },
      cta: { allOf: ["actionLabel", "actionType"] },
    },
    requiredRootFields: [],
    requiredItemFields: [],
    minItems: 1,
    maxItems: 5,
    isOverlay: true,
    maxPerPage: 1,
    allowsVideo: false,
    defaultOptions: {},
  }),
  popup: entry({
    componentType: "popup",
    variants: ["image", "form", "imageForm"],
    defaultVariant: "image",
    allowedRoles: ["root", "image", "form", "cta"],
    requiredRoles: [{ role: "root", min: 1 }],
    roleFieldRequirements: {
      root: { anyOf: ["title", "description"] },
      image: { anyOf: ["imagePc", "imageMobile"] },
      cta: { allOf: ["actionLabel", "actionType"] },
    },
    requiredRootFields: [],
    requiredItemFields: [],
    minItems: 1,
    maxItems: 10,
    isOverlay: true,
    maxPerPage: 1,
    allowsVideo: false,
    defaultOptions: {},
  }),
};

export function getComponentRegistryEntry(
  componentType: string
): ComponentRegistryEntry | undefined {
  return COMPONENT_REGISTRY[componentType];
}

export function isKnownComponentType(componentType: string): boolean {
  return Object.prototype.hasOwnProperty.call(COMPONENT_REGISTRY, componentType);
}
