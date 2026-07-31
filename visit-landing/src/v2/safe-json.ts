/**
 * 안전한 JSON 파싱 — prototype pollution 키 제거, plain object만 허용.
 */

import { FORBIDDEN_JSON_KEYS } from "./component-registry";

const POLLUTION_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const RENDER_BYPASS_KEYS = new Set<string>(FORBIDDEN_JSON_KEYS);

export type SafeJsonParseResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; reason: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  if (Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** 중첩 plain object만 복사하며 금지 키 제거 */
export function sanitizePlainObject(
  input: unknown,
  depth = 0
): Record<string, unknown> | null {
  if (depth > 8) return null;
  if (!isPlainObject(input)) return null;
  const out: Record<string, unknown> = Object.create(null);
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string") continue;
    if (POLLUTION_KEYS.has(key) || RENDER_BYPASS_KEYS.has(key)) continue;
    const raw = (input as Record<string, unknown>)[key];
    if (isPlainObject(raw)) {
      const nested = sanitizePlainObject(raw, depth + 1);
      if (nested) out[key] = { ...nested };
    } else if (
      raw === null ||
      typeof raw === "string" ||
      typeof raw === "number" ||
      typeof raw === "boolean"
    ) {
      out[key] = raw;
    } else if (Array.isArray(raw)) {
      out[key] = raw.map((item) => {
        if (isPlainObject(item)) {
          const nested = sanitizePlainObject(item, depth + 1);
          return nested ? { ...nested } : null;
        }
        if (
          item === null ||
          typeof item === "string" ||
          typeof item === "number" ||
          typeof item === "boolean"
        ) {
          return item;
        }
        return null;
      });
    }
    // functions / class instances 등 무시
  }
  return { ...out };
}

/**
 * optionsJson / extraJson 파싱.
 * 실패 시 ok:false (호출측에서 기본값·경고).
 */
export function parseSafeJsonObject(
  raw: string | Record<string, unknown> | null | undefined
): SafeJsonParseResult {
  if (raw == null || raw === "") {
    return { ok: true, value: {} };
  }
  if (typeof raw === "object") {
    const sanitized = sanitizePlainObject(raw);
    if (!sanitized) {
      return { ok: false, reason: "not_plain_object" };
    }
    return { ok: true, value: sanitized };
  }
  if (typeof raw !== "string") {
    return { ok: false, reason: "unsupported_type" };
  }
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: {} };
  try {
    const parsed: unknown = JSON.parse(trimmed);
    const sanitized = sanitizePlainObject(parsed);
    if (!sanitized) {
      return { ok: false, reason: "parsed_not_plain_object" };
    }
    return { ok: true, value: sanitized };
  } catch {
    return { ok: false, reason: "json_parse_error" };
  }
}

export type FilterAllowedKeysResult = {
  value: Record<string, unknown>;
  removedKeys: string[];
};

/**
 * 레지스트리 허용 키만 유지. 금지·미허용 키는 제거하고 목록 반환.
 */
export function filterAllowedKeys(
  input: Record<string, unknown>,
  allowedKeys: readonly string[]
): FilterAllowedKeysResult {
  const allowed = new Set(allowedKeys);
  const value: Record<string, unknown> = {};
  const removedKeys: string[] = [];
  for (const [key, raw] of Object.entries(input)) {
    if (POLLUTION_KEYS.has(key) || RENDER_BYPASS_KEYS.has(key) || !allowed.has(key)) {
      removedKeys.push(key);
      continue;
    }
    value[key] = raw;
  }
  return { value, removedKeys };
}
