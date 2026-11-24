"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  COOKIE_SETTINGS_EVENT,
  type CookieConsent,
  type CookieConsentChoice,
} from "@/lib/cookies/consent";

/**
 * Cookie-баннер (ACC-03).
 *
 * Стоит в потоке страницы, а не поверх неё: так он не перекрывает кнопки и
 * текст — важно для аудитории 55+. Пока выбора нет, баннер виден; после
 * сохранения исчезает и больше не показывается до смены версии политики.
 *
 * «Только необходимые» и «Принять все» — равнодоступные крупные кнопки,
 * без тёмных паттернов и таймеров.
 */
export function CookieBanner({ initialConsent }: { initialConsent: CookieConsent | null }) {
  const [visible, setVisible] = useState(initialConsent === null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analytics, setAnalytics] = useState(initialConsent?.analytics ?? false);
  const [marketing, setMarketing] = useState(initialConsent?.marketing ?? false);
  const [hasChoice, setHasChoice] = useState(initialConsent !== null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function openSettings() {
      setVisible(true);
      setSettingsOpen(true);
      setError(null);
    }

    window.addEventListener(COOKIE_SETTINGS_EVENT, openSettings);
    return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, openSettings);
  }, []);

  async function save(next: CookieConsentChoice): Promise<void> {
    if (busy) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/cookies/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });

      if (!response.ok) {
        setError("Не удалось сохранить настройки. Попробуйте ещё раз через минуту.");
        return;
      }

      setAnalytics(next.analytics);
      setMarketing(next.marketing);
      setHasChoice(true);
      setVisible(false);
      setSettingsOpen(false);
    } catch {
      setError("Нет связи с сайтом. Проверьте интернет и попробуйте снова.");
    } finally {
      setBusy(false);
    }
  }

  function closeSettings(): void {
    setError(null);
    if (hasChoice) {
      setVisible(false);
    } else {
      setSettingsOpen(false);
    }
  }

  if (!visible) return null;

  return (
    <section
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-description"
      className="border-b-2 border-accent bg-accent-soft"
    >
      <div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-6">
        <div className="space-y-2">
          <h2 id="cookie-banner-title" className="text-xl font-bold text-ink">
            Cookie и ваши настройки
          </h2>
          <p
            id="cookie-banner-description"
            className="max-w-3xl text-base leading-relaxed text-ink-soft"
          >
            Необходимые cookie нужны для входа и выбранного размера текста — они работают
            всегда. Аналитику и рекламу включаем только с вашего согласия. Подробности — в{" "}
            <a
              href="/legal/cookies"
              className="font-semibold text-accent underline underline-offset-4"
            >
              Cookie-политике
            </a>
            .
          </p>
        </div>

        {error ? (
          <p role="alert" className="text-base font-semibold text-danger">
            {error}
          </p>
        ) : null}

        {settingsOpen ? (
          <fieldset className="space-y-4 rounded-control border border-line bg-surface p-4">
            <legend className="px-1 text-lg font-semibold">Настройки cookie</legend>

            <label className="flex min-h-12 items-start gap-3 text-base leading-relaxed">
              <input
                type="checkbox"
                checked
                readOnly
                disabled
                className="mt-1 h-6 w-6 shrink-0 accent-[var(--color-accent)]"
              />
              <span>
                <span className="block font-semibold text-ink">Необходимые</span>
                Вход, безопасность и выбранный размер текста. Отключить нельзя.
              </span>
            </label>

            <label className="flex min-h-12 cursor-pointer items-start gap-3 text-base leading-relaxed">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(event) => setAnalytics(event.target.checked)}
                className="mt-1 h-6 w-6 shrink-0 accent-[var(--color-accent)]"
              />
              <span>
                <span className="block font-semibold text-ink">Аналитика</span>
                Обезличенная статистика: какие тесты открывают и где возникают ошибки. Сейчас
                выключена.
              </span>
            </label>

            <label className="flex min-h-12 cursor-pointer items-start gap-3 text-base leading-relaxed">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(event) => setMarketing(event.target.checked)}
                className="mt-1 h-6 w-6 shrink-0 accent-[var(--color-accent)]"
              />
              <span>
                <span className="block font-semibold text-ink">Реклама и партнёры</span>
                Персональные предложения и партнёрские материалы. Сейчас выключена.
              </span>
            </label>

            <div className="flex flex-wrap gap-3 pt-1">
              <Button type="button" onClick={() => void save({ analytics, marketing })} disabled={busy}>
                {busy ? "Сохраняем…" : "Сохранить выбор"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void save({ analytics: true, marketing: true })}
                disabled={busy}
              >
                Принять все
              </Button>
              <Button type="button" variant="quiet" onClick={closeSettings} disabled={busy}>
                {hasChoice ? "Закрыть" : "Назад"}
              </Button>
            </div>
          </fieldset>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void save({ analytics: false, marketing: false })}
              disabled={busy}
            >
              Только необходимые
            </Button>
            <Button
              type="button"
              onClick={() => void save({ analytics: true, marketing: true })}
              disabled={busy}
            >
              Принять все
            </Button>
            <Button type="button" variant="quiet" onClick={() => setSettingsOpen(true)} disabled={busy}>
              Настроить
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
