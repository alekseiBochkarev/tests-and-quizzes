import { handleRouteError } from "@/lib/auth/api";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { countDueQuestions } from "@/lib/attempts/service";
import { prisma } from "@/lib/db";
import { ContentStatus } from "@/lib/generated/prisma/enums";
import { fail, ok } from "@/lib/http/json";
import { getRequestId } from "@/lib/http/requestId";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/v1/me/review — очередь повторения: сколько и какие вопросы пора повторить. */
export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const user = await getCurrentUser();
  if (!user) return fail("unauthorized", "Нужно войти в аккаунт.", { requestId, status: 401 });

  try {
    const now = new Date();
    const [dueCount, rows] = await Promise.all([
      countDueQuestions(user.id),
      prisma.questionProgress.findMany({
        where: {
          userId: user.id,
          OR: [{ nextReviewAt: { lte: now } }, { masteryLevel: { lte: 2 } }],
          question: { status: ContentStatus.PUBLISHED },
        },
        orderBy: [{ nextReviewAt: "asc" }, { masteryLevel: "asc" }],
        take: 20,
        include: {
          question: {
            select: {
              id: true,
              text: true,
              topic: { select: { id: true, slug: true, title: true } },
            },
          },
        },
      }),
    ]);

    return ok(
      {
        dueCount,
        questions: rows.map((row) => ({
          id: row.question.id,
          text: row.question.text,
          topic: row.question.topic,
          masteryLevel: row.masteryLevel,
          nextReviewAt: row.nextReviewAt,
        })),
      },
      { requestId },
    );
  } catch (error) {
    return handleRouteError(error, requestId, "me/review");
  }
}
