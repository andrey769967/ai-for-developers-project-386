# Запись на звонок

[![hexlet-check](https://github.com/andrey769967/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/andrey769967/ai-for-developers-project-386/actions)

Упрощённое приложение для записи на встречи, вдохновлённое [cal.com](https://cal.com).

Учебный проект Хекслета: https://ru.hexlet.io/programs/ai-for-developers

## Возможности

- Владелец создаёт типы встреч (название, описание, длительность)
- Гость выбирает тип встречи, видит календарь свободных слотов на 14 дней и записывается
- Защита от двойной записи (включая разные типы встреч)
- Back-to-back записи разрешены (следующая начинается в момент окончания предыдущей)
- Контракт-first разработка: TypeSpec -> OpenAPI -> клиентский SDK

## Технологии

| Слой | Технология |
|------|-----------|
| Контракт API | TypeSpec 1.18 |
| Backend | Node.js + Fastify 5 + TypeScript |
| Frontend | React 19 + Vite 8 + Tailwind CSS 4 |
| Типы (frontend) | openapi-typescript + openapi-fetch |
| Тесты | Vitest |
| Хранилище | In-memory (Map) |

## Спецификационные константы

| Параметр | Значение |
|----------|---------|
| Часовой пояс | Europe/Moscow (UTC+3) |
| Рабочие часы | 09:00 - 18:00 |
| Окно записи | 14 календарных дней от сегодня |
| Шаг старта слотов | 15 минут (:00, :15, :30, :45) |
| Длительность слота | равна длительности типа встречи (кратно 15) |
| Back-to-back | разрешён |
| Пересечение интервалов | запрещено (включая разные типы) |

## Запуск через Docker

Нужен только Docker с плагином Compose. Ни Node.js, ни база данных, ни аккаунты,
ни банковская карта не требуются.

```bash
docker compose up --build
```

Приложение доступно на http://localhost:3000

- `/` - страница гостя (выбор типа встречи, календарь, запись)
- `/health` - проверка живости, отвечает `{"status":"ok"}`
- Угол сверху справа: переключение на календарь владельца

Остановить: `Ctrl+C`, затем `docker compose down`.

Логи: `docker compose logs -f`.

Другой порт: `PORT=8080 docker compose up --build`. В PowerShell сначала
задайте переменную: `$env:PORT = "8080"`.

Данные живут в памяти контейнера: `docker compose restart` сбрасывает все типы
встреч и записи и заново создаёт три типа встреч по умолчанию.

Без Compose:

```bash
docker build -t call-booking .
docker run --rm -p 3000:3000 call-booking
```

## Локальная разработка

```bash
# Клонирование
git clone https://github.com/andrey769967/ai-for-developers-project-386.git
cd ai-for-developers-project-386

# Установка зависимостей
npm install

# Генерация OpenAPI-спецификации и TypeScript-типов
npm run generate

# Запуск backend (порт 3000)
npm run dev:server

# Запуск frontend (порт 5173, проксирует /api на :3000)
npm run dev:web

# Запуск тестов
npm run test
```

## Структура проекта

```
calendar/
  contract/          TypeSpec-контракт API
    main.tsp         Определения моделей и операций
    tspconfig.yaml   Конфигурация эмиттеров
  server/            Backend (Fastify)
    src/
      config.ts      Спецификационные константы
      api-schema.d.ts Сгенерированные из контракта модели API
      types.ts       Алиасы моделей + ApiError
      storage/        In-memory хранилище
      services/       Логика доступности и создания записей
      routes/         Fastify маршруты
    tests/            Vitest тесты
  web/                Frontend (React + Vite)
    src/
      lib/api/        API-клиент и сгенерированные типы
      components/     UI-компоненты
      pages/          Страницы гостя и владельца
  Dockerfile          Multi-stage build
```

## Цепочка генерации кода

```
TypeSpec (main.tsp)
    |
    v  @typespec/openapi3
OpenAPI 3.1 (openapi.yaml)
    |
    +--> v  openapi-typescript
    |    web/src/lib/api/schema.d.ts   (типы клиента)
    |         |
    |         v  openapi-fetch
    |    Типобезопасный HTTP-клиент для React
    |
    +--> v  openapi-typescript
         server/src/api-schema.d.ts    (модели сервера)
```

Оба сгенерированных файла лежат в git и не редактируются вручную. После изменения контракта выполните `npm run generate` из корня; `npm run build` делает это сам и падает, если модели сервера разошлись с контрактом.

## API

| Метод | Путь | Описание |
|-------|------|---------|
| GET | /health | Проверка живости: 200 и `{"status":"ok"}` |
| GET | /api/meeting-types | Список типов встреч |
| POST | /api/meeting-types | Создать тип встречи |
| DELETE | /api/meeting-types/:id | Удалить тип встречи |
| GET | /api/meeting-types/:id/slots | Свободные слоты на 14 дней |
| GET | /api/bookings | Список записей |
| POST | /api/bookings | Создать запись |

## Ограничения

- Данные хранятся в памяти процесса. При перезапуске сервера все записи (типы встреч и записи) сбрасываются. Приложение инициализирует три типа встреч по умолчанию.
- Аутентификация не реализована: владелец предопределён, страница календаря владельца доступна без пароля.
- Маршруты Fastify и логика не генерируются из TypeSpec (нет эмиттера). Модели API генерируются из контракта в `server/src/api-schema.d.ts`; маршруты и валидация тел запросов написаны вручную и проверяются тестами.

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы обучения с практикой, поддержкой наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
