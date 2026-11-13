# Zaytseva Interior Workspace

Рабочее пространство дизайн-студии: проекты и этапы, задачи, календарь, напоминания, комплектация и сравнение вариантов, ожидания, договорённости, платежи и вложения.

Исходники синхронизированы с работающей версией от 13 ноября 2026 года, включая исправление восстановления авторизации после временных сбоев. Frontend использует Next.js и React, backend — FastAPI и SQLAlchemy, база данных — PostgreSQL 16. Уведомления обрабатывает отдельный worker.

## Структура

- `frontend/` — интерфейс и зафиксированные зависимости `package-lock.json`.
- `backend/` — API, worker, миграции Alembic и тесты.
- `docker-compose.yml` — запуск базы, API, worker и интерфейса.
- `deploy/nginx.conf.example` — пример проксирования интерфейса и `/api/`.

Рабочие пароли, база, загруженные файлы и резервные копии в исходники не входят. Старые архивы релизов удалены из текущего дерева Git; история коммитов сохранена.

## Запуск через Docker Compose

Создайте `.env` из `.env.example`, задайте собственные `POSTGRES_PASSWORD` и `SECRET_KEY`. Пароль в `DATABASE_URL` должен соответствовать `POSTGRES_PASSWORD`; специальные символы в URL необходимо кодировать.

```bash
cp .env.example .env
docker compose build
docker compose up -d db
docker compose run --rm backend alembic upgrade head
docker compose up -d
```

Перед миграциями существующей базы сделайте её резервную копию. Если PostgreSQL ещё запускается, дождитесь его готовности перед командой Alembic. Для старой версии Compose используйте `docker-compose` вместо `docker compose`.

Nginx направляет `/` на `127.0.0.1:13000`, а `/api/` на `127.0.0.1:18000/`. В примере конфигурации замените домен на свой и настройте HTTPS для рабочего использования. Проверки состояния: `/api/health` и `/api/health/db`. Учётные записи из рабочей базы и начальные пароли не поставляются.

## Проверки

```bash
cd frontend
npm ci
npm run typecheck
npm run build
```

Регрессионные браузерные проверки авторизации описаны в [frontend/tests/README.md](frontend/tests/README.md). Они подменяют API синтетическими ответами и проверяют обрывы соединения, 5xx, таймаут, повторное подключение, 401 и выход из аккаунта.

Для backend используйте отдельное Python-окружение:

```bash
cd backend
python -m pip install -r requirements-dev.txt
python -m pytest
```

Тесты используют временную SQLite-базу; рабочая PostgreSQL-база им не нужна.
