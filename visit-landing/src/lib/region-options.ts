import type { SiteConfig } from "./types";

/** 기본: 시(특별·광역·주요 시) 기준 */
export const DEFAULT_REGION_OPTIONS = [
  "서울특별시",
  "부산광역시",
  "대구광역시",
  "인천광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
  "세종특별자치시",
  "수원시",
  "성남시",
  "고양시",
  "용인시",
  "부천시",
  "안산시",
  "안양시",
  "남양주시",
  "화성시",
  "평택시",
  "의정부시",
  "시흥시",
  "파주시",
  "김포시",
  "광명시",
  "광주시",
  "군포시",
  "하남시",
  "오산시",
  "이천시",
  "안성시",
  "의왕시",
  "양주시",
  "구리시",
  "포천시",
  "동두천시",
  "과천시",
  "춘천시",
  "원주시",
  "강릉시",
  "속초시",
  "청주시",
  "충주시",
  "제천시",
  "천안시",
  "아산시",
  "공주시",
  "전주시",
  "익산시",
  "군산시",
  "목포시",
  "여수시",
  "순천시",
  "포항시",
  "경주시",
  "구미시",
  "김천시",
  "창원시",
  "김해시",
  "진주시",
  "양산시",
  "거제시",
  "제주시",
  "서귀포시",
  "기타",
];

export function resolveRegionOptions(
  config: SiteConfig
): { value: string; label: string }[] {
  const custom = config.reservationForm?.regionOptions;
  const list =
    custom && custom.length > 0 ? custom : DEFAULT_REGION_OPTIONS;
  return list.map((t) => ({ value: t, label: t }));
}

/** 기본 N — 컬럼 없으면 숨김 */
export function isBirthDateFieldEnabled(config: SiteConfig): boolean {
  return config.reservationForm?.birthDateEnabled === true;
}

export function isRegionFieldEnabled(config: SiteConfig): boolean {
  return config.reservationForm?.regionEnabled === true;
}
