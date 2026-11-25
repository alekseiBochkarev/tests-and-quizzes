import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

/**
 * Карточка сайта по умолчанию для соцсетей и мессенджеров (GRW-01).
 *
 * Нужна для главной, каталога и всех страниц без своей картинки: без неё
 * превью ссылки в Telegram или WhatsApp оставалось пустым.
 *
 * Шрифт Golos Text лежит в `assets/fonts`: стандартный шрифт `next/og`
 * не содержит кириллицы.
 */

export const alt = "Тесты — проверьте себя";
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

export default async function Image() {
  return new ImageResponse(
    (
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
            <div
              style={{
                display: "flex",
                fontSize: 84,
                fontWeight: 700,
                lineHeight: 1.15,
                color: INK,
                marginBottom: 20,
              }}
            >
              Проверьте себя
            </div>
            <div style={{ display: "flex", fontSize: 44, color: INK_SOFT }}>
              История, кино, природа, наука и общие знания
            </div>
          </div>

          <div style={{ display: "flex", fontSize: 28, color: MUTED }}>
            Короткие тесты с объяснениями — без таймеров и спешки
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Golos Text", data: fontRegular, style: "normal", weight: 400 },
        { name: "Golos Text", data: fontBold, style: "normal", weight: 700 },
      ],
    },
  );
}
