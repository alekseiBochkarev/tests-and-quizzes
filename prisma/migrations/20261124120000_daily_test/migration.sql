-- LRN-02: «Тест дня». Миграция аддитивная: новое значение AttemptMode,
-- nullable-колонка Attempt.dailyDate и уникальный индекс «одна попытка в день».
-- Существующие попытки получают dailyDate = NULL и продолжают работать.

-- AlterEnum
ALTER TYPE "AttemptMode" ADD VALUE 'DAILY';

-- AlterTable
ALTER TABLE "Attempt" ADD COLUMN     "dailyDate" DATE;

-- CreateIndex
CREATE UNIQUE INDEX "Attempt_userId_dailyDate_key" ON "Attempt"("userId", "dailyDate");
