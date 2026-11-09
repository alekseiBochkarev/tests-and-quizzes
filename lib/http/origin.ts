/**
 * CSRF-проверка для state-changing запросов (§4.5, AC-SEC-01).
 *
 * Основное правило: если браузер прислал Origin, он обязан совпадать
 * с origin приложения. Дополнительно учитываются заголовки `Sec-Fetch-Site`
 * и `Referer`: они закрывают случаи, когда Origin отсутствует, но запрос
 * явно пришёл с другого сайта.
 *
 * Запросы без браузерных подсказок (curl, серверные интеграции) разрешаются:
 * CSRF опасен только для запросов, которые браузер автоматически снабжает
 * cookie, а такие запросы всегда содержат Origin при POST с формы.
 *
 * `appUrl` параметризован для unit-тестов. В рантайме APP_URL уже проверен
 * в lib/env.ts при старте приложения.
 */
export function assertSameOrigin(
  request: Request,
  appUrl: string = process.env.APP_URL ?? "",
): boolean {
  if (!appUrl) return false;

  let expectedOrigin: string;
  try {
    expectedOrigin = new URL(appUrl).origin;
  } catch {
    return false;
  }

  const origin = request.headers.get("origin");
  if (origin) {
    return origin === expectedOrigin;
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return false;
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin === expectedOrigin;
    } catch {
      return false;
    }
  }

  return true;
}
