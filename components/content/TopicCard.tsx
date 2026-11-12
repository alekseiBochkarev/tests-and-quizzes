import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { questionWord, topicLevelLabel } from "@/lib/ui/text";

export type TopicCardProps = {
  href: string;
  title: string;
  description?: string | null;
  questionCount: number;
  categoryTitle?: string;
  reason?: string;
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
 */
export function TopicCard({
  href,
  title,
  description,
  questionCount,
  categoryTitle,
  reason,
  progress,
}: TopicCardProps) {
  return (
    <Card className="flex h-full flex-col justify-between gap-4">
      <div className="space-y-2">
        {reason ? (
          <p className="text-base font-semibold tracking-wide text-accent uppercase">{reason}</p>
        ) : categoryTitle ? (
          <p className="text-base font-semibold tracking-wide text-muted uppercase">
            {categoryTitle}
          </p>
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
