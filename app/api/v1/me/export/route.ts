import { AUTH_MESSAGES, handleRouteError } from "@/lib/auth/api";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { loadAccountExportSource } from "@/lib/account/data";
import { attemptsToCsv, buildAccountExport } from "@/lib/account/export";
import { fail } from "@/lib/http/json";
import { REQUEST_ID_HEADER, getRequestId } from "@/lib/http/requestId";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/me/export — скачать свои данные (ACC-01, LEG-5).
 *
 * `?format=csv` отдаёт историю тренировок для Excel, без параметра — полный
 * JSON: профиль, согласия, интересы, попытки с ответами, прогресс, статистика.
 * Ответ всегда `no-store` и с `Content-Disposition: attachment`.
 */
export async function GET(request: Request) {
  const requestId = getRequestId(request);

  const user = await getCurrentUser();
  if (!user) {
    return fail("unauthorized", AUTH_MESSAGES.unauthorized, { requestId, status: 401 });
  }

  try {
    const source = await loadAccountExportSource(user.id);
    if (!source) {
      return fail("unauthorized", AUTH_MESSAGES.unauthorized, { requestId, status: 401 });
    }

    const payload = buildAccountExport(source);
    const date = payload.exportedAt.slice(0, 10);
    const format = new URL(request.url).searchParams.get("format");

    if (format === "csv") {
      return new Response(attemptsToCsv(payload.attempts, source.profile.timezone), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="testy-attempts-${date}.csv"`,
          "Cache-Control": "no-store, private",
          [REQUEST_ID_HEADER]: requestId,
        },
      });
    }

    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="testy-data-${date}.json"`,
        "Cache-Control": "no-store, private",
        [REQUEST_ID_HEADER]: requestId,
      },
    });
  } catch (error) {
    return handleRouteError(error, requestId, "me/export");
  }
}
