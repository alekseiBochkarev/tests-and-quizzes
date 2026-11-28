import type { TopicThemeKey } from "@/lib/ui/topicThemes";
import { cn } from "@/lib/utils/cn";

/**
 * Рисованные мотивы тем. Всё — собственные SVG-сцены из линий и заливок:
 * никаких постеров, кадров из фильмов и логотипов, поэтому лицензии не нужны.
 * Цвет наследуется от родителя (`currentColor`), размер задаётся классами.
 */

export function TopicHeroArt({
  theme,
  className,
}: {
  theme: TopicThemeKey;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 260 160"
      aria-hidden="true"
      focusable="false"
      className={cn("topic-hero-art", className)}
    >
      {theme === "cinema" ? <CinemaScene /> : <MusicScene />}
    </svg>
  );
}

export function TopicMark({
  theme,
  className,
}: {
  theme: TopicThemeKey;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
    >
      {theme === "cinema" ? <CinemaMark /> : <MusicMark />}
    </svg>
  );
}

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
