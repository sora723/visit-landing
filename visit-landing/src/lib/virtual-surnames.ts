/** 가상 방문예약 — 허용 성씨만 (20종) */

const ALLOWED_SURNAMES: readonly { surname: string; weight: number }[] = [
  { surname: "김", weight: 22 },
  { surname: "이", weight: 15 },
  { surname: "박", weight: 10 },
  { surname: "최", weight: 6 },
  { surname: "정", weight: 6 },
  { surname: "강", weight: 4 },
  { surname: "조", weight: 4 },
  { surname: "윤", weight: 3 },
  { surname: "장", weight: 3 },
  { surname: "임", weight: 3 },
  { surname: "한", weight: 2 },
  { surname: "오", weight: 2 },
  { surname: "서", weight: 2 },
  { surname: "신", weight: 2 },
  { surname: "권", weight: 2 },
  { surname: "황", weight: 2 },
  { surname: "안", weight: 2 },
  { surname: "송", weight: 2 },
  { surname: "류", weight: 2 },
  { surname: "홍", weight: 2 },
];

export const ALLOWED_VIRTUAL_SURNAMES = ALLOWED_SURNAMES.map((e) => e.surname);

/** 가상 생성 금지 희귀 성씨 */
export const FORBIDDEN_SURNAMES = [
  "남궁",
  "제갈",
  "독고",
  "선우",
  "사공",
  "황보",
  "망절",
  "어금",
  "소봉",
  "동방",
  "서문",
  "장곡",
] as const;

/** 실제 접수 마스킹용 복성 */
export const COMPOUND_SURNAMES = FORBIDDEN_SURNAMES;

function toMasked(surname: string) {
  return `${surname}○○`;
}

export function pickWeightedKoreanSurnameSeeded(
  rand: () => number,
  usedNames: Set<string> = new Set()
): string {
  let pool = ALLOWED_SURNAMES.filter((e) => !usedNames.has(toMasked(e.surname)));
  if (pool.length === 0) pool = [...ALLOWED_SURNAMES];

  const total = pool.reduce((sum, e) => sum + e.weight, 0);
  let roll = rand() * total;

  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) return entry.surname;
  }

  return pool[pool.length - 1]!.surname;
}

export function pickWeightedKoreanSurname(
  usedNames: Set<string> = new Set()
): string {
  let pool = ALLOWED_SURNAMES.filter((e) => !usedNames.has(toMasked(e.surname)));
  if (pool.length === 0) pool = [...ALLOWED_SURNAMES];

  const total = pool.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * total;

  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) return entry.surname;
  }

  return pool[pool.length - 1]!.surname;
}

export function pickWeightedKoreanSurnames(
  count: number,
  usedNames: Set<string> = new Set()
): string[] {
  const localUsed = new Set(usedNames);
  const picked: string[] = [];

  for (let i = 0; i < count; i++) {
    const surname = pickWeightedKoreanSurname(localUsed);
    picked.push(surname);
    localUsed.add(toMasked(surname));
  }

  return picked;
}
