import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Хеширование паролей: scrypt в self-describing формате (§4.5).
 *
 * Формат: `scrypt$<v>$<N>$<r>$<p>$<saltBase64>$<hashBase64>`.
 * Параметры по умолчанию: N=16384, r=8, p=1, keylen=64, salt=16 байт.
 * Ни пароль, ни хеш не пишутся в логи.
 */

const CURRENT_VERSION = 1;
const N = 16_384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const SALT_BYTES = 16;
const MAX_MEM = 64 * 1024 * 1024;

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_BYTES);
  const hash = scryptSync(password, salt, KEY_LENGTH, { N, r: R, p: P, maxmem: MAX_MEM });

  return [
    "scrypt",
    String(CURRENT_VERSION),
    String(N),
    String(R),
    String(P),
    salt.toString("base64"),
    hash.toString("base64"),
  ].join("$");
}

/**
 * Проверяет пароль против сохранённого хеша. Неизвестный формат или
 * некорректные параметры дают `false`, а не исключение: повреждённая запись
 * не должна валить весь вход.
 */
export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;

  const parts = stored.split("$");
  if (parts.length !== 7) return false;

  const [algorithm, versionRaw, nRaw, rRaw, pRaw, saltBase64, hashBase64] = parts;
  if (algorithm !== "scrypt") return false;

  const version = Number.parseInt(versionRaw ?? "", 10);
  const n = Number.parseInt(nRaw ?? "", 10);
  const r = Number.parseInt(rRaw ?? "", 10);
  const p = Number.parseInt(pRaw ?? "", 10);

  if (version !== CURRENT_VERSION) return false;
  if (!Number.isFinite(n) || n < 2 || !Number.isFinite(r) || r < 1 || !Number.isFinite(p) || p < 1) {
    return false;
  }
  // Ограничиваем параметры: запись из БД не должна позволить выделить
  // произвольный объём памяти при проверке.
  if (n > 1_048_576 || r > 32 || p > 16) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltBase64 ?? "", "base64");
    expected = Buffer.from(hashBase64 ?? "", "base64");
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;

  let actual: Buffer;
  try {
    actual = scryptSync(password, salt, expected.length, { N: n, r, p, maxmem: MAX_MEM });
  } catch {
    return false;
  }

  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

/**
 * Хеш-заглушка для выравнивания времени входа (§4.5, AC-AUTH-11).
 * Вычисляется один раз при загрузке модуля; пароль-заглушка случайный
 * и нигде не сохраняется.
 */
export const DUMMY_HASH = hashPassword(randomBytes(32).toString("hex"));
