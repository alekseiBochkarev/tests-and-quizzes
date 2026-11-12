import { handleRouteError } from "@/lib/auth/api";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getTopicBySlug } from "@/lib/content/catalog";
import { fail, ok } from "@/lib/http/json";
import { getRequestId } from "@/lib/http/requestId";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string }> };

/** GET /api/v1/topics/[slug] — тема, количество вопросов и прогресс. */
export async function GET(request: Request, context: RouteContext) {
  const requestId = getRequestId(request);
  const { slug } = await context.params;

  try {
    const user = await getCurrentUser();
    const topic = await getTopicBySlug(slug, user?.id ?? null);
    if (!topic) {
      return fail("topic_not_found", "Тема не найдена.", { requestId, status: 404 });
    }
    return ok({ topic }, { requestId });
  } catch (error) {
    return handleRouteError(error, requestId, "topics");
  }
}
