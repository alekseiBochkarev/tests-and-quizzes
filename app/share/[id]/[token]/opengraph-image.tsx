import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { attemptTitle } from "@/lib/attempts/display";
import { env } from "@/lib/env";
import { getSharedAttempt } from "@/lib/share/service";
import { clampText, scoreLine } from "@/lib/share/text";
import { verifyShareToken } from "@/lib/share/token";

/**
 * OG-карточка публичного результата (GRW-01).
 *
 * Картинку запрашивают мессенджеры и соцсети — без cookie и без входа.
 * Поэтому данных ровно столько же, сколько на самой странице: название теста,
 * процент и число верных ответов. Ни почты, ни имени, ни ответов.
 *
 * Шрифт Golos Text лежит в `assets/fonts`: стандартный шрифт `next/og`
 * не содержит кириллицы, и русский текст превратился бы в пустые квадраты.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const alt = "Результат теста";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "#f6f4ef";
const INK = "#1b1f24";
const INK_SOFT = "#343b43";
const MUTED = "#4a525c";
const ACCENT = "#0f5b5b";

const [fontRegular, fontBold] = await Promise.all([
  readFile(join(process.cwd(), "assets/fonts/GolosText-Regular.ttf")),
  readFile(join(process.cwd(), "assets/fonts/GolosText-Bold.ttf")),
]);

function Card({
  title,
  percent,
  score,
}: {
  title: string;
  percent: number | null;
  score: string | null;
}) {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: PAPER,
        fontFamily: "Golos Text",
      }}
    >
      <div style={{ display: "flex", width: 20, background: ACCENT }} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          flex: 1,
          padding: "56px 64px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: ACCENT }}>
            Тесты
          </div>
          <div style={{ display: "flex", fontSize: 28, color: MUTED }}>
            крупный текст · спокойный темп
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {title ? (
            <div
              style={{
                display: "flex",
                fontSize: 46,
                lineHeight: 1.2,
                color: INK_SOFT,
                marginBottom: 24,
              }}
            >
              {title}
            </div>
          ) : null}

          {percent !== null && score !== null ? (
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 168,
                  fontWeight: 700,
                  lineHeight: 1,
                  color: ACCENT,
                }}
              >
                {percent}%
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 40,
                  color: INK,
                  marginLeft: 32,
                  marginBottom: 18,
                }}
              >
                {score}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", fontSize: 84, fontWeight: 700, color: ACCENT }}>
              Проверьте себя
            </div>
          )}
        </div>

        <div style={{ display: "flex", fontSize: 28, color: MUTED }}>
          Короткие тесты с объяснениями — без таймеров и спешки
        </div>
      </div>
    </div>
  );
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string; token: string }>;
}) {
  const { id, token } = await params;

  const attempt = verifyShareToken(id, token, env.AUTH_SECRET)
    ? await getSharedAttempt(id)
    : null;

  const title = attempt ? clampText(attemptTitle(attempt), 68) : "";
  const score = attempt ? scoreLine(attempt.correctCount, attempt.questionCount) : null;

  return new ImageResponse(
    <Card title={title} percent={attempt?.percent ?? null} score={score} />,
    {
      ...size,
      fonts: [
        { name: "Golos Text", data: fontRegular, style: "normal", weight: 400 },
        { name: "Golos Text", data: fontBold, style: "normal", weight: 700 },
      ],
    },
  );
}
