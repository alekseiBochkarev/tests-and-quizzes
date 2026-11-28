import type { ReactElement } from "react";

import type { TopicHeroThemeKey, TopicThemeKey } from "@/lib/ui/topicThemes";
import { cn } from "@/lib/utils/cn";

/**
 * Рисованные мотивы тем. Всё — собственные SVG-сцены из линий и заливок:
 * никаких постеров, кадров из фильмов и логотипов, поэтому лицензии не нужны.
 * Цвет наследуется от родителя (`currentColor`), размер задаётся классами.
 *
 * Конвенции знака: viewBox 0 0 32 32, обводка 2.2–2.5, `aria-hidden`, без `id`,
 * без градиентов и внешних файлов. Сцены — 260×160 и только для пяти тем
 * уровня B (§4 ТЗ). Рисунки лежат в исчерпывающих картах
 * `Record<ключ, компонент>`: новый ключ без рисунка не соберётся, а чужой
 * рисунок вместо своего не отрисуется.
 */

/** Уровень B: сцена в шапке. Узкий тип не даёт передать сюда тему уровня A. */
export function TopicHeroArt({
  theme,
  className,
}: {
  theme: TopicHeroThemeKey;
  className?: string;
}) {
  const Scene = HERO_SCENES[theme];

  return (
    <svg
      viewBox="0 0 260 160"
      aria-hidden="true"
      focusable="false"
      className={cn("topic-hero-art", className)}
    >
      <Scene />
    </svg>
  );
}

/** Знак темы 32×32: есть у всех девяти ключей. */
export function TopicMark({ theme, className }: { theme: TopicThemeKey; className?: string }) {
  const Mark = MARKS[theme];

  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
    >
      <Mark />
    </svg>
  );
}

/** Сцены шапки — только уровни B. */
const HERO_SCENES: Record<TopicHeroThemeKey, () => ReactElement> = {
  cinema: CinemaScene,
  music: MusicScene,
  literature: BookScene,
  animals: NatureScene,
  magic: MagicScene,
};

/** Знаки — все девять ключей реестра. */
const MARKS: Record<TopicThemeKey, () => ReactElement> = {
  cinema: CinemaMark,
  music: MusicMark,
  literature: LiteratureMark,
  history: HistoryMark,
  geography: GeographyMark,
  animals: AnimalsMark,
  cooking: CookingMark,
  nostalgia: NostalgiaMark,
  magic: MagicMark,
};

/** Кинокамера с двумя катушками, лучом и перфорацией плёнки. */
function CinemaScene() {
  return (
    <g>
      <g fill="none" stroke="currentColor" strokeWidth="3" opacity="0.85">
        {/* корпус камеры */}
        <rect x="96" y="86" width="92" height="46" rx="8" />
        {/* объектив */}
        <path d="M188 96 L222 82 L222 136 L188 122 Z" />
        {/* катушки */}
        <circle cx="128" cy="60" r="22" />
        <circle cx="170" cy="48" r="28" />
        <circle cx="128" cy="60" r="5" />
        <circle cx="170" cy="48" r="6" />
        {/* плёнка выходит из корпуса */}
        <path d="M96 112 C74 112 60 126 40 126" />
      </g>

      {/* перфорация на плёнке */}
      <g fill="currentColor" opacity="0.75">
        <rect x="50" y="117" width="6" height="6" rx="1" />
        <rect x="66" y="114" width="6" height="6" rx="1" />
        <rect x="82" y="111" width="6" height="6" rx="1" />
      </g>

      {/* луч проектора */}
      <path d="M222 92 L258 74 L258 136 L222 124 Z" fill="currentColor" opacity="0.14" />

      {/* пылинки в луче */}
      <g fill="currentColor" opacity="0.55">
        <circle cx="240" cy="56" r="2.6" />
        <circle cx="250" cy="70" r="1.8" />
        <circle cx="232" cy="44" r="1.6" />
        <circle cx="246" cy="104" r="2" />
      </g>
    </g>
  );
}

/** Нотный стан с тремя нотами под дугой и клавиатура. */
function MusicScene() {
  return (
    <g>
      <g stroke="currentColor" strokeWidth="2" opacity="0.4">
        <path d="M12 56h236M12 68h236M12 80h236M12 92h236M12 104h236" />
      </g>

      <g fill="currentColor" opacity="0.85">
        <ellipse cx="78" cy="96" rx="10" ry="7" transform="rotate(-20 78 96)" />
        <rect x="85" y="62" width="3.5" height="34" rx="1.5" />
        <ellipse cx="122" cy="84" rx="10" ry="7" transform="rotate(-20 122 84)" />
        <rect x="129" y="50" width="3.5" height="34" rx="1.5" />
        <ellipse cx="166" cy="72" rx="10" ry="7" transform="rotate(-20 166 72)" />
        <rect x="173" y="38" width="3.5" height="34" rx="1.5" />
        {/* вязка нот */}
        <path d="M85 62 L176.5 38 L176.5 50 L85 74 Z" />
      </g>

      {/* клавиатура */}
      <g fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.8">
        <rect x="30" y="126" width="200" height="30" rx="3" />
        <path d="M70 126v30M110 126v30M150 126v30M190 126v30" />
      </g>
      <g fill="currentColor" opacity="0.8">
        <rect x="55" y="126" width="10" height="17" rx="1.5" />
        <rect x="95" y="126" width="10" height="17" rx="1.5" />
        <rect x="135" y="126" width="10" height="17" rx="1.5" />
        <rect x="175" y="126" width="10" height="17" rx="1.5" />
      </g>
    </g>
  );
}

/**
 * Раскрытая книга с закладкой и пером: «книжный» тон без чужих обложек,
 * корешков и цитат (§6.3 ТЗ). Линия 2.5, залив страниц 8 %.
 */
function BookScene() {
  return (
    <g>
      {/* страницы книги */}
      <g
        fill="currentColor"
        fillOpacity="0.08"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      >
        <path d="M26 100c32-16 66-20 104-8v30c-38-12-72-8-104 8Z" />
        <path d="M234 100c-32-16-66-20-104-8v30c38-12 72-8 104 8Z" />
      </g>

      {/* строки на страницах — не текст, а ритм набора */}
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4">
        <path d="M44 108c18-4 44-5 66-2" />
        <path d="M44 118c18-4 44-5 66-2" />
        <path d="M150 106c18-3 34-2 46 2" />
        <path d="M150 116c18-3 34-2 46 2" />
      </g>

      {/* закладка-лента на правой странице */}
      <path
        d="M206 90h14v24l-7-6-7 6Z"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* перо над книгой */}
      <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M150 84C170 68 196 50 228 30" />
        <path
          d="M228 30C206 33 188 45 176 64 194 60 214 48 228 30Z"
          fill="currentColor"
          fillOpacity="0.08"
          strokeLinejoin="round"
        />
      </g>

      {/* линия стола */}
      <path d="M18 142h224" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" />
    </g>
  );
}

/**
 * Линия горизонта, силуэты птиц и следы: природа без «мультяшных» глаз,
 * улыбок и кислотно-зелёного (§6.4 ТЗ).
 */
function NatureScene() {
  return (
    <g>
      {/* линия горизонта */}
      <path
        d="M10 112C52 100 92 104 134 111c44 7 78-4 116-11"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.85"
      />

      {/* птицы: две дуги крыльев, без глаз и мультяшности */}
      <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M62 54q10-9 20 0q10-9 20 0" />
        <path d="M158 38q8-7 16 0q8-7 16 0" />
        <path d="M208 68q6-5 12 0q6-5 12 0" />
      </g>

      {/* следы на земле */}
      <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.9">
        <path d="M86 146l-6-10M86 146v-11M86 146l6-10" />
        <path d="M112 134l-5-8M112 134v-9M112 134l5-8" />
      </g>
    </g>
  );
}

/**
 * Ночное небо, свеча, запечатанный конверт и перо: «кино и книга 2000-х»,
 * а не детский праздник (§6.5 ТЗ). Линия 2.5, залив ≤ 10 %, звёзды 1–2 px.
 *
 * Юридическая рамка: только собственные формы. Запрещено — логотип франшизы,
 * гербы факультетов, молния, круглые очки, символ Даров Смерти, платформа 9¾,
 * силуэт замка, кадры фильмов и постеры, брендовые шрифты.
 */
function MagicScene() {
  return (
    <g>
      {/* редкие звёзды 1–2 px */}
      <g fill="currentColor" opacity="0.6">
        <circle cx="34" cy="26" r="1.4" />
        <circle cx="78" cy="46" r="1" />
        <circle cx="112" cy="18" r="1.6" />
        <circle cx="146" cy="58" r="1.2" />
        <circle cx="184" cy="22" r="1" />
        <circle cx="226" cy="44" r="1.4" />
        <circle cx="54" cy="64" r="1" />
        <circle cx="212" cy="64" r="1" />
      </g>

      {/* две звёздочки-искры 2 px */}
      <g fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.7">
        <path d="M96 34v6M93 37h6" />
        <path d="M242 78v6M239 81h6" />
      </g>

      {/* запечатанный конверт */}
      <g
        fill="currentColor"
        fillOpacity="0.06"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      >
        <rect x="24" y="94" width="92" height="50" rx="4" />
      </g>
      <path
        d="M27 98l43 30 43-30"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle
        cx="70"
        cy="126"
        r="4.5"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeWidth="2"
      />

      {/* свеча в подсвечнике */}
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect
          x="196"
          y="86"
          width="16"
          height="48"
          rx="2.5"
          fill="currentColor"
          fillOpacity="0.06"
        />
        <path d="M204 86v-6" />
        <path d="M204 80c-6-6-2-13 0-16 2 3 6 10 0 16Z" fill="currentColor" fillOpacity="0.08" />
        <path d="M184 134h40" />
        <path d="M204 134v8" />
        <path d="M188 146h32" />
      </g>

      {/* перо между конвертом и свечой */}
      <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M126 144C142 126 158 106 174 82" />
        <path
          d="M174 82c-16 1-30 10-38 24 13-2 26-10 38-24Z"
          fill="currentColor"
          fillOpacity="0.08"
          strokeLinejoin="round"
        />
      </g>

      {/* линия стола */}
      <path d="M14 152h232" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" />
    </g>
  );
}

/** Маленькая катушка киноплёнки. */
function CinemaMark() {
  return (
    <g fill="none" stroke="currentColor" strokeWidth="2.2">
      <circle cx="16" cy="16" r="11" />
      <circle cx="16" cy="16" r="3" />
      <circle cx="16" cy="7.5" r="1.6" fill="currentColor" />
      <circle cx="16" cy="24.5" r="1.6" fill="currentColor" />
      <circle cx="8.6" cy="11.8" r="1.6" fill="currentColor" />
      <circle cx="23.4" cy="11.8" r="1.6" fill="currentColor" />
      <circle cx="8.6" cy="20.2" r="1.6" fill="currentColor" />
      <circle cx="23.4" cy="20.2" r="1.6" fill="currentColor" />
    </g>
  );
}

/** Маленькая клавиатура. */
function MusicMark() {
  return (
    <g>
      <rect
        x="3"
        y="9"
        width="26"
        height="14"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M9 9v14M15 9v14M21 9v14" stroke="currentColor" strokeWidth="1.6" />
      <g fill="currentColor">
        <rect x="6.5" y="9" width="3" height="8" rx="0.8" />
        <rect x="12.5" y="9" width="3" height="8" rx="0.8" />
        <rect x="21.5" y="9" width="3" height="8" rx="0.8" />
      </g>
    </g>
  );
}

/** Раскрытая книга с закладкой-лентой. */
function LiteratureMark() {
  return (
    <g>
      <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
        <path d="M16 9.8C13.3 7.9 9.9 7.2 5.6 7.2v15.9c4.3 0 7.7.7 10.4 2.6 2.7-1.9 6.1-2.6 10.4-2.6V7.2c-4.3 0-7.7.7-10.4 2.6Z" />
        <path d="M16 9.8v15.9" />
      </g>
      <g fill="currentColor" opacity="0.55">
        <rect x="8.4" y="12.8" width="5" height="1.6" rx="0.8" />
        <rect x="8.4" y="16.6" width="5" height="1.6" rx="0.8" />
        <rect x="18.6" y="12.8" width="5" height="1.6" rx="0.8" />
        <rect x="18.6" y="16.6" width="5" height="1.6" rx="0.8" />
      </g>
      <path
        d="M20.6 5.6h4v7.4l-2-1.6-2 1.6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </g>
  );
}

/** Лента времени: ось, метки и три точки. Без звезды, флагов и гербов. */
function HistoryMark() {
  return (
    <g>
      <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M4 18h24" />
        <path d="M9 14v4M16 11v7M23 14v4" />
      </g>
      <g fill="currentColor">
        <circle cx="9" cy="14" r="2.2" />
        <circle cx="16" cy="11" r="2.2" />
        <circle cx="23" cy="14" r="2.2" />
      </g>
    </g>
  );
}

/** Глобус с меридианами — без компаса-звезды, чтобы не путать с историей. */
function GeographyMark() {
  return (
    <g fill="none" stroke="currentColor" strokeWidth="2.2">
      <circle cx="16" cy="16" r="11.2" />
      <path d="M4.8 16h22.4" strokeWidth="1.8" />
      <path d="M16 4.8c-4.4 3.4-4.4 18.8 0 22.4 4.4-3.6 4.4-19 0-22.4Z" strokeWidth="1.8" />
    </g>
  );
}

/** След птицы: три пальца вперёд и один назад, без мультяшности. */
function AnimalsMark() {
  return (
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 18.4 9.2 8.6" />
      <path d="M16 18.4V7.6" />
      <path d="M16 18.4 22.8 8.6" />
      <path d="M16 18.4v6" />
    </g>
  );
}

/** Кастрюля с крышкой и ручками. */
function CookingMark() {
  return (
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6.5 15.5h19v4.6a6.4 6.4 0 0 1-6.4 6.4h-6.2a6.4 6.4 0 0 1-6.4-6.4Z" />
      <path d="M4 15.5h2.5M25.5 15.5H28" />
      <path d="M9 11.5h14" />
      <path d="M16 7.5v4" />
    </g>
  );
}

/** Радиоприёмник: антенна, динамик и шкала. */
function NostalgiaMark() {
  return (
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="12" width="24" height="14.5" rx="2.4" />
      <path d="M9.5 7.5 17 12" />
      <circle cx="12" cy="19.2" r="3.2" />
      <path d="M19.5 17h4.5M19.5 21.4h4.5" strokeWidth="1.8" />
    </g>
  );
}

/** Запечатанный конверт — абстрактный знак, не герб и не эмблема. */
function MagicMark() {
  return (
    <g>
      <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
        <rect x="3.5" y="9" width="25" height="15" rx="2.6" />
        <path d="M5 11 16 19.4 27 11" />
      </g>
      <circle cx="16" cy="19.4" r="1.9" fill="currentColor" />
    </g>
  );
}
