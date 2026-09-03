# Zaytseva Interior Workspace — frontend v2

Frontend рабочего пространства студии, перестроенный вокруг работы комплектатора.

## Что включено

- авторизация через существующий FastAPI `/auth/login`;
- новый dashboard комплектатора `/dashboard/procurement`;
- проекты и стандартные этапы;
- комплектация проекта и карточка позиции;
- контрольные точки позиции;
- документы и фотографии у позиции комплектации;
- раздел «Жду» с напоминаниями;
- договорённости внутри проекта;
- операционный контроль денег;
- задачи, workflow, комментарии и вложения;
- агрегированный календарь: месяц, неделя, произвольный период;
- адаптация интерфейса для смартфона и desktop без отдельной мобильной стилистики.

Интерфейс не содержит демонстрационных проектов и фиктивных рабочих данных.

## Настройка

Создайте `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Установите зависимости:

```bash
npm install
```

Запуск:

```bash
npm run dev
```

Frontend: `http://localhost:3000`

Backend: `http://127.0.0.1:8000`

## Backend API, который использует эта версия

Новая часть frontend рассчитана на реализованные endpoints:

- `GET /dashboard/procurement`
- `/projects/{project_id}/procurement-items`
- `/projects/{project_id}/procurement-items/{item_id}/checkpoints`
- `/waiting-items` и `/projects/{project_id}/waiting-items`
- `/agreements` и `/projects/{project_id}/agreements`
- `/payments`, `/payments/summary`, `/projects/{project_id}/payments`
- `GET /calendar?date_from=...&date_to=...`
- endpoints `attachments` для комментариев и позиций комплектации

Существующие `/projects`, `/tasks`, `/users/me`, `/users/options`, `/auth/login` также используются.

## Замена предыдущей версии

Лучше сохранить старую папку `frontend` резервной копией, затем заменить её содержимое файлами из этого архива. Если у вас уже есть рабочий `.env.local`, сохраните его — в архиве находится только `.env.local.example`.
