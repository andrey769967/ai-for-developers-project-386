# Запись на звонок

[![hexlet-check](https://github.com/andrey769967/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/andrey769967/ai-for-developers-project-386/actions)

Упрощённое приложение для записи на встречи, вдохновлённое [cal.com](https://cal.com).

Учебный проект Хекслета: https://ru.hexlet.io/programs/ai-for-developers

## Возможности

- Владелец создаёт типы встреч (название, описание, длительность)
- Гость выбирает тип встречи, видит календарь свободных слотов на 14 дней и записывается
- Защита от двойного бронирования (включая разные типы встреч)
- Back-to-back бронирования разрешены (следующая встреча начинается в момент окончания предыдущей)
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

```bash
docker build -t call-booking .
docker run -p 3000:3000 call-booking
```

Приложение доступно на http://localhost:3000

- `/` - страница гостя (выбор типа встречи, календарь, запись)
- Угол сверху справа: переключение на страницу управления

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
      types.ts        Типы (соответствуют контракту)
      storage/        In-memory хранилище
      services/       Логика доступности и бронирования
      routes/         Fastify маршруты
    tests/            Vitest тесты
  web/                Frontend (React + Vite)
    src/
      lib/api/        API-клиент и сгенерированные типы
      components/     UI-компоненты
      pages/          Страницы гостя и администратора
  Dockerfile          Multi-stage build
```

## Цепочка генерации кода

```
TypeSpec (main.tsp)
    |
    v  @typespec/openapi3
OpenAPI 3.1 (openapi.yaml)
    |
    v  openapi-typescript
TypeScript типы (schema.d.ts)
    |
    v  openapi-fetch
Типобезопасный HTTP-клиент для React
```

## API

| Метод | Путь | Описание |
|-------|------|---------|
| GET | /api/meeting-types | Список типов встреч |
| POST | /api/meeting-types | Создать тип встречи |
| DELETE | /api/meeting-types/:id | Удалить тип встречи |
| GET | /api/meeting-types/:id/slots | Свободные слоты на 14 дней |
| GET | /api/bookings | Список бронирований |
| POST | /api/bookings | Создать бронирование |

## Ограничения

- Данные хранятся в памяти процесса. При перезапуске сервера все записи (типы встреч и бронирования) сбрасываются. Приложение инициализирует три типа встреч по умолчанию.
- Аутентификация не реализована: владелец предопределён, страница управления доступна без пароля.
- Серверные типы и маршруты не генерируются из TypeSpec (нет эмиттера для Fastify). Бекенд реализован вручную по контракту и проверяется тестами.

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы обучения с практикой, поддержкой наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
