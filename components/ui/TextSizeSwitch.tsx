"use client";

import { useEffect, useState } from "react";

import {
  TEXT_SIZE_COOKIE,
  TEXT_SIZE_LABELS,
  TEXT_SIZES,
  type TextSize,
} from "@/lib/textSize";
import { cn } from "@/lib/utils/cn";

/**
 * Переключатель размера текста: три шага 18 / 20 / 22 px.
 * Выбор сразу меняет data-text-size на <html> и сохраняется в cookie,
 * поэтому root layout применяет его на сервере при следующем запросе.
 */
export function TextSizeSwitch({ current }: { current: TextSize }) {
  const [value, setValue] = useState<TextSize>(current);

  useEffect(() => {
    document.documentElement.dataset.textSize = value;
    document.cookie = `${TEXT_SIZE_COOKIE}=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }, [value]);

  return (
    <div role="group" aria-label="Размер текста" className="flex flex-wrap items-center gap-2">
      {TEXT_SIZES.map((size) => {
        const selected = size === value;

        return (
          <button
            key={size}
            type="button"
            aria-pressed={selected}
            onClick={() => setValue(size)}
            className={cn(
              "inline-flex min-h-12 items-center rounded-control border-2 px-3 py-2 text-base font-semibold transition-colors",
              selected
                ? "border-accent bg-accent text-white"
                : "border-line-strong bg-surface text-ink hover:bg-accent-soft",
            )}
          >
            {TEXT_SIZE_LABELS[size]}
          </button>
        );
      })}
    </div>
  );
}
