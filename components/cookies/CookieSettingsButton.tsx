"use client";

import { Button } from "@/components/ui/Button";
import { COOKIE_SETTINGS_EVENT } from "@/lib/cookies/consent";

/**
 * Кнопка «Изменить настройки cookie» для Cookie-политики.
 *
 * Баннер живёт в layout и слушает событие, поэтому отдельный диалог и
 * дублирование логики не нужны.
 */
export function CookieSettingsButton() {
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={() => window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT))}
    >
      Изменить настройки cookie
    </Button>
  );
}
