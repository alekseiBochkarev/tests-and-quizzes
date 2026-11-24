-- ACC-03: отдельные типы согласий для категорий cookie.
-- Изменение аддитивное: существующие TERMS/PRIVACY/MARKETING не меняются.

ALTER TYPE "ConsentType" ADD VALUE 'COOKIE_ANALYTICS';
ALTER TYPE "ConsentType" ADD VALUE 'COOKIE_MARKETING';
