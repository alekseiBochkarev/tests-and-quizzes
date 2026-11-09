import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { authConfig } from "@/lib/auth/authConfig";
import { listDevMail } from "@/lib/auth/mail";
import type { DevMailEntry } from "@/lib/auth/mail";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Письма для разработки",
  robots: { index: false, follow: false },
};

function linksFromText(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s<>"']+/g) ?? [];
  return Array.from(new Set(matches));
}

function MailEntry({ entry }: { entry: DevMailEntry }) {
  const links = linksFromText(entry.text);

  return (
    <Card>
      <h2 className="text-xl font-bold">{entry.subject || "Без темы"}</h2>
      <p className="mt-1 text-base text-muted">
        Кому: {entry.to || "—"} · {entry.sentAt || "—"}
      </p>
      <pre className="mt-4 max-w-full overflow-x-auto rounded-control bg-paper p-4 text-base leading-relaxed whitespace-pre-wrap break-words">
        {entry.text}
      </pre>
      {links.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-base font-semibold">Ссылки из письма:</p>
          <ul className="space-y-2">
            {links.map((url) => (
              <li key={url}>
                <a
                  href={url}
                  className="text-base break-all text-accent underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}

export default async function DevMailboxPage() {
  if (authConfig.appEnv === "production") notFound();

  let entries: DevMailEntry[] = [];
  let readFailed = false;

  try {
    entries = await listDevMail();
  } catch {
    readFailed = true;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Письма для разработки</h1>
        <p className="text-lg text-ink-soft">
          Это локальный почтовый ящик. Он показывает письма, которые приложение записало в
          <code className="mx-1 rounded bg-paper px-1">logs/dev-mail.log</code>.
        </p>
      </div>

      <Alert variant="neutral" title="Только для разработки">
        Страница доступна при APP_ENV=local или test. В production она возвращает 404, а транспорт
        писем «в файл» запрещён на старте.
      </Alert>

      <p className="flex flex-wrap gap-4 text-base">
        <Link href="/_dev/mailbox" className="font-semibold text-accent underline">
          Обновить список
        </Link>
        <Link href="/register" className="font-semibold text-accent underline">
          Открыть форму сохранения результатов
        </Link>
      </p>

      {readFailed ? (
        <Alert variant="error" title="Не удалось прочитать письма">
          Проверьте права на папку logs и попробуйте ещё раз.
        </Alert>
      ) : null}

      {!readFailed && entries.length === 0 ? (
        <Card>
          <h2 className="text-xl font-bold">Писем пока нет</h2>
          <p className="mt-2 text-base text-ink-soft">
            Зарегистрируйтесь — письмо для подтверждения появится здесь сразу после отправки.
          </p>
        </Card>
      ) : null}

      {entries.map((entry, index) => (
        <MailEntry key={`${entry.sentAt}-${index}`} entry={entry} />
      ))}
    </div>
  );
}
