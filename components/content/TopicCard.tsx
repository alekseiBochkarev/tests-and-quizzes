import { TopicMark } from "@/components/content/TopicArt";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { questionWord, topicLevelLabel } from "@/lib/ui/text";
import type { TopicThemeKey } from "@/lib/ui/topicThemes";
import { cn } from "@/lib/utils/cn";

export type TopicCardProps = {
  href: string;
  title: string;
  description?: string | null;
  questionCount: number;
  categoryTitle?: string;
  reason?: string;
  /** Ключ оформления темы; `null` — карточка выглядит нейтрально. */
  theme?: TopicThemeKey | null;
  progress?: {
    progress: number;
    seenQuestions: number;
    masteredQuestions: number;
    level: number;
  } | null;
};

/**
 * Карточка темы в каталоге и рекомендациях.
 * Показываем простые числа: сколько вопросов, сколько уже освоено.
 *
 * Уровень A оформления (§3.5 ТЗ): полоса 3 px по верхней кромке и знак 32 px
 * в надзаголовке. Больше ничего — ни теней, ни градиентных кнопок; тема без
 * ключа выглядит как раньше.
 */
export function TopicCard({
  href,
  title,
  description,
  questionCount,
  categoryTitle,
  reason,
  theme,
  progress,
}: TopicCardProps) {
  const overline = reason ?? categoryTitle ?? null;

  return (
    <Card
      data-topic-theme={theme ?? undefined}
      className={cn(
        "flex h-full flex-col justify-between gap-4",
        theme && "relative overflow-hidden",
      )}
    >
      {theme ? (
        <div className="topic-card-band absolute inset-x-0 top-0" aria-hidden="true" />
      ) : null}

      <div className="space-y-2">
        {overline || theme ? (
          <div className="flex items-center gap-2">
            {theme ? <TopicMark theme={theme} className="h-8 w-8 text-accent" /> : null}
            {overline ? (
              <p
                className={cn(
                  "text-base font-semibold tracking-[0.02em] normal-case",
                  reason ? "text-accent" : "text-muted",
                )}
              >
                {overline}
              </p>
            ) : null}
          </div>
        ) : null}

        <h3 className="text-xl font-bold leading-snug">
          <a href={href} className="underline-offset-4 hover:text-accent hover:underline">
            {title}
          </a>
        </h3>

        {description ? <p className="text-base text-ink-soft">{description}</p> : null}

        <p className="text-base text-muted">
          {questionCount} {questionWord(questionCount)}
        </p>
      </div>

      <div className="space-y-4">
        {progress && progress.seenQuestions > 0 ? (
          <div className="space-y-2">
            <ProgressBar
              value={progress.progress}
              label={`Освоено ${Math.round(progress.progress)}%`}
              tone="success"
            />
            <p className="text-base text-muted">
              {topicLevelLabel(progress.level)} · изучено {progress.seenQuestions} из{" "}
              {questionCount} · освоено {progress.masteredQuestions}
            </p>
          </div>
        ) : (
          <p className="text-base text-muted">Ещё не начато — можно попробовать.</p>
        )}

        <Button href={href} variant="secondary" fullWidth>
          {progress && progress.seenQuestions > 0 ? "Продолжить" : "Открыть тему"}
        </Button>
      </div>
    </Card>
  );
}
