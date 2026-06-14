import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Building2,
  Calendar,
  Car,
  Check,
  Coins,
  Diamond,
  Gift,
  Home,
  Leaf,
  MapPin,
  Percent,
  Phone,
  Receipt,
  Shield,
  Star,
  Tag,
  TrainFront,
  Trophy,
  Users,
} from "lucide-react";

/** Google Sheet cardIcon1~3 키 */
export const HERO_CARD_ICON_KEYS = [
  "money",
  "percent",
  "building",
  "calendar",
  "gift",
  "diamond",
  "shield",
  "home",
  "train",
  "users",
  "trophy",
  "star",
  "check",
  "chart",
  "leaf",
  "coin",
  "phone",
  "location",
  "car",
  "tag",
] as const;

export type HeroCardIconKey = (typeof HERO_CARD_ICON_KEYS)[number];

const ICON_MAP: Record<HeroCardIconKey, LucideIcon> = {
  money: Receipt,
  percent: Percent,
  building: Building2,
  calendar: Calendar,
  gift: Gift,
  diamond: Diamond,
  shield: Shield,
  home: Home,
  train: TrainFront,
  users: Users,
  trophy: Trophy,
  star: Star,
  check: Check,
  chart: BarChart3,
  leaf: Leaf,
  coin: Coins,
  phone: Phone,
  location: MapPin,
  car: Car,
  tag: Tag,
};

export function normalizeHeroCardIconKey(
  raw?: string | null
): HeroCardIconKey | undefined {
  const key = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!key) return undefined;
  return HERO_CARD_ICON_KEYS.includes(key as HeroCardIconKey)
    ? (key as HeroCardIconKey)
    : undefined;
}

export function HeroCardIcon({
  name,
  className,
}: {
  name?: string | null;
  className?: string;
}) {
  const key = normalizeHeroCardIconKey(name);
  if (!key) return null;
  const Icon = ICON_MAP[key];
  return <Icon className={className} aria-hidden />;
}
