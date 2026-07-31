import type { ValidatedV2ContentItem } from "@/v2/types";

export function itemsByRole(
  items: readonly ValidatedV2ContentItem[],
  role: string
): ValidatedV2ContentItem[] {
  return items
    .filter((i) => i.role === role)
    .slice()
    .sort((a, b) => a.order - b.order || a.itemId.localeCompare(b.itemId));
}

export function firstByRole(
  items: readonly ValidatedV2ContentItem[],
  role: string
): ValidatedV2ContentItem | undefined {
  return itemsByRole(items, role)[0];
}

export function itemHasVisibleContent(item: ValidatedV2ContentItem): boolean {
  return Boolean(
    item.title ||
      item.subtitle ||
      item.description ||
      item.value ||
      item.badge ||
      item.eyebrow ||
      item.imagePc ||
      item.imageMobile ||
      item.videoUrl ||
      item.actionLabel
  );
}
