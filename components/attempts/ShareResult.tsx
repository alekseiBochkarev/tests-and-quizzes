"use client";

import { useRef, useState, useSyncExternalStore } from "react";

import { buttonClassName } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

/**
 * Блок «Поделиться результатом» (GRW-01, RES-6).
 *
 * Три равнодоступных пути: системное окно «Поделиться» (мобильные), копирование
 * ссылки и мессенджеры. Ничего не открывается автоматически: для аудитории 55+
 * действие всегда инициирует человек.
 *
 * Ссылка ведёт на публичную страницу `/share/...`, где виден только итог.
 * Сама страница результата остаётся закрытой: логин и почта в ссылку не попадают.
 */

type ShareResultProps = {
  /** Абсолютная ссылка на публичную страницу результата. */
  url: string;
  /** Заголовок для системного окна «Поделиться». */
  title: string;
  /** Текст сообщения без ссылки: её мессенджеры добавляют сами. */
  text: string;
};

type Network = {
  id: string;
  label: string;
  href: (url: string, text: string) => string;
};

const NETWORKS: readonly Network[] = [
  {
    id: "telegram",
    label: "Telegram",
    href: (url, text) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    href: (url, text) => `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
  },
  {
    id: "ok",
    label: "Одноклассники",
    href: (url, text) =>
      `https://connect.ok.ru/offer?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
  },
  {
    id: "vk",
    label: "ВКонтакте",
    href: (url, text) =>
      `https://vk.com/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
  },
];

function subscribeToNothing(): () => void {
  return () => {};
}

function hasNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export function ShareResult({ url, title, text }: ShareResultProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");

  // navigator.share есть не везде. useSyncExternalStore даёт серверный
  // снимок `false`, поэтому гидратация не расходится, а после неё
  // кнопка появляется только там, где системное окно действительно есть.
  const canNativeShare = useSyncExternalStore(subscribeToNothing, hasNativeShare, () => false);

  async function nativeShare() {
    try {
      await navigator.share({ title, text, url });
      setStatus("Спасибо! Ссылка отправлена.");
    } catch (cause) {
      // Отмена окна — не ошибка: человек передумал.
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setStatus("Не удалось открыть окно «Поделиться». Скопируйте ссылку ниже.");
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Ссылка скопирована. Вставьте её в сообщение или письмо.");
      return;
    } catch {
      // Браузер может запретить буфер обмена — тогда выделяем ссылку.
    }

    const input = inputRef.current;
    if (!input) {
      setStatus("Выделите ссылку и скопируйте её вручную.");
      return;
    }

    input.focus();
    input.select();

    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }

    setStatus(
      copied
        ? "Ссылка скопирована. Вставьте её в сообщение или письмо."
        : "Ссылка выделена. Скопируйте её сочетанием клавиш Ctrl+C.",
    );
  }

  return (
    <section aria-labelledby="share-title" className="space-y-4">
      <div className="space-y-2">
        <h2 id="share-title" className="text-2xl font-bold">
          Поделиться результатом
        </h2>
        <p className="text-base text-ink-soft">
          Ссылка покажет только итог: тест, результат и дату. Почта и ответы не раскрываются.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {canNativeShare ? (
          <button type="button" className={buttonClassName()} onClick={() => void nativeShare()}>
            Поделиться
          </button>
        ) : null}
        <button
          type="button"
          className={buttonClassName({ variant: "secondary" })}
          onClick={() => void copyLink()}
        >
          Скопировать ссылку
        </button>
      </div>

      <div className="space-y-2">
        <label htmlFor="share-url" className="block text-base font-semibold">
          Ссылка на результат
        </label>
        <input
          id="share-url"
          ref={inputRef}
          readOnly
          value={url}
          onFocus={(event) => event.currentTarget.select()}
          className={cn(
            "min-h-14 w-full rounded-control border-2 border-line bg-surface px-4 py-3",
            "text-lg text-ink",
          )}
        />
      </div>

      <p role="status" aria-live="polite" className="min-h-6 text-base text-success">
        {status}
      </p>

      <div className="space-y-2">
        <p className="text-base font-semibold">Или отправьте в мессенджер</p>
        <ul className="flex flex-wrap gap-3">
          {NETWORKS.map((network) => (
            <li key={network.id}>
              <a
                className={buttonClassName({ variant: "secondary" })}
                href={network.href(url, text)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Поделиться в ${network.label}`}
              >
                {network.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
