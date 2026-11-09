/**
 * Выполняется один раз при старте нового серверного инстанса Next.js.
 * Валидация env вынесена сюда, чтобы приложение падало при запуске,
 * а не на первом запросе пользователя.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("./lib/env");
    validateEnv();
  }
}
