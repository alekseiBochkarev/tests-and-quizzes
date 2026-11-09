/**
 * Расчёт состояния `failedLoginCount` / `lockedUntil` после неудачного входа.
 *
 * Функция чистая: не читает БД и не зависит от текущего времени, всё
 * передаётся параметрами. Роут login применяет результат к `User`.
 *
 * Правила (§4.5, AC-AUTH-13):
 * - активная блокировка не продлевается и счётчик не растёт;
 * - истёкшая блокировка со старым счётчиком сбрасывается, чтобы одна
 *   опечатка после разблокировки не запирала аккаунт ещё на 15 минут;
 * - достижение порога выставляет `lockedUntil`;
 * - обычная неудача просто увеличивает счётчик.
 */

export type NextFailedLoginState = {
  failedLoginCount: number;
  lockedUntil: Date | null;
  /** false — состояние в БД не меняется (активная блокировка). */
  shouldUpdate: boolean;
};

export function nextFailedLoginState(params: {
  failedLoginCount: number;
  lockedUntil: Date | null;
  now: Date;
  maxFailedAttempts: number;
  lockoutMinutes: number;
}): NextFailedLoginState {
  const { failedLoginCount, lockedUntil, now, maxFailedAttempts, lockoutMinutes } = params;
  const nowMs = now.getTime();

  // Активная блокировка: неверный пароль не продлевает её и не инкрементирует
  // счётчик, иначе перебором можно было бы удерживать аккаунт закрытым вечно.
  if (lockedUntil !== null && lockedUntil.getTime() > nowMs) {
    return { failedLoginCount, lockedUntil, shouldUpdate: false };
  }

  // Блокировка истекла. Старый счётчик (>= порога) сбрасываем перед текущей
  // неудачей: после разблокировки пользователь получает полный набор попыток.
  const previousCount =
    lockedUntil !== null || failedLoginCount >= maxFailedAttempts ? 0 : failedLoginCount;
  const nextCount = previousCount + 1;

  if (nextCount >= maxFailedAttempts) {
    return {
      failedLoginCount: nextCount,
      lockedUntil: new Date(nowMs + lockoutMinutes * 60 * 1000),
      shouldUpdate: true,
    };
  }

  return { failedLoginCount: nextCount, lockedUntil: null, shouldUpdate: true };
}
