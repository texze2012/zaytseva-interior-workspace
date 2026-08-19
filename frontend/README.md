# Zaytseva Interior — Frontend

Готовый frontend для текущего FastAPI backend проекта Zaytseva Interior.

## Что уже работает

- Авторизация через `POST /auth/login`
- Получение текущего пользователя через `GET /users/me`
- Разные dashboard-сценарии для `owner` и `designer`
- Проекты: список, создание, карточка проекта
- Автоматически созданные этапы отображаются в карточке проекта
- Задачи проекта: создание и список
- Общая страница задач с desktop Kanban и mobile list
- Workflow задачи: `planned -> in_progress -> review -> done`
- Возврат Ольгой `review -> in_progress` с обязательной причиной
- Комментарии к задачам
- Календарь на ближайшие 7 дней по дедлайнам задач
- Responsive/mobile-first адаптация с нижней навигацией

Экран `Активность` пока является заглушкой, потому что в backend ещё нет общего `ActivityLog` endpoint.

## 1. Установка

Открой терминал в папке `frontend`:

```powershell
npm install
```

Создай `.env.local` на основе `.env.local.example`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Запуск:

```powershell
npm run dev
```

Открыть:

```text
http://localhost:3000
```

Backend должен быть запущен на:

```text
http://127.0.0.1:8000
```

## 2. Важно: CORS на FastAPI

Frontend и backend работают на разных origin, поэтому в FastAPI нужно включить CORS.

Смотри файл `BACKEND_REQUIRED_CHANGES.md`.

## 3. Пользователи в select

Frontend поддерживает `/users/options`, чтобы и Ольга, и Кристина могли выбирать исполнителя без выдачи email.

Если endpoint ещё не добавлен:
- под Ольгой frontend временно использует `GET /users`;
- под Кристиной в списке будет только её аккаунт.

Добавь endpoint из `BACKEND_REQUIRED_CHANGES.md`, и оба аккаунта смогут видеть безопасный список исполнителей.

## 4. Структура

```text
frontend/
├── app/
│   ├── (workspace)/
│   │   ├── dashboard/
│   │   ├── projects/
│   │   ├── tasks/
│   │   ├── calendar/
│   │   └── activity/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
├── lib/
├── public/
├── .env.local.example
├── package.json
└── tsconfig.json
```

## 5. Production

Для production поменяй:

```env
NEXT_PUBLIC_API_URL=https://workspace-api.example.ru
```

или на адрес backend за Nginx.

JWT сейчас хранится в `localStorage`, потому что текущий backend возвращает Bearer token JSON. Для первой рабочей версии это совместимо с уже написанным API. Перед публичным production-запуском лучше перевести сессию на Secure + HttpOnly cookie через BFF/route handler или изменить схему авторизации backend.
