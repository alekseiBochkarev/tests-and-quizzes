-- Выполняется только при первой инициализации пустого тома PostgreSQL.
-- Если том pgdata уже существует, скрипт не запустится — используйте
-- `npm run db:test:up` (создаёт quiz_test в уже работающем контейнере).
SELECT 'CREATE DATABASE quiz_test OWNER quiz'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'quiz_test')\gexec
