# AGENTS.md

## Проект

Приложение для записи на звонки ("Запись на звонок") по мотивам cal.com. TypeScript-монорепозиторий через npm workspaces: `contract/`, `server/`, `web/`.

## Команды

```
npm install                              # установить все зависимости workspaces
npm run build                            # полная сборка: contract -> типы клиента -> web -> server
npm run generate                         # TypeSpec -> OpenAPI + типы фронтенда
npm run test                             # vitest (только server)
npm run lint                             # ESLint по server, web, e2e и конфигам
npm run smoke                            # smoke живого сервера по BASE_URL (только чтение)
npm run check                            # все проверки: линтер, SDK, артефакты, тесты, сборка, E2E
npm run dev:server                       # Fastify на :3000 (tsx watch)
npm run dev:web                          # Vite на :5173, проксирует /api -> :3000
docker build -t call-booking .           # multi-stage: собирает всё, раздаёт на :3000
```

Запуск одного тестового файла:

```
npx vitest run tests/bookings.test.ts    # из server/
```

`npm run check` — единственная команда, которая прогоняет все проверки локально: линтер, проверку использования SDK, свежесть сгенерированных артефактов, тесты сервера, полную сборку и сквозной сценарий гостя на Playwright против настоящего сервера, без подмены ответов API. CI запускает её же, поэтому локальный и CI-прогоны не расходятся.

`npm run smoke` проверяет живой сервер по `BASE_URL` (по умолчанию `http://127.0.0.1:3000`): health, типы встреч, 14-дневное окно, слоты и список записей. Только чтение, данные не меняет, поэтому годится и для публичного стенда.

## Цепочка генерации кода (порядок важен)

1. `tsp compile .` (в `contract/`) генерирует `contract/tsp-output/@typespec/openapi3/openapi.yaml`
2. `openapi-typescript` читает этот YAML, пишет `web/src/lib/api/schema.d.ts` (типы клиента)
3. `openapi-typescript` читает тот же YAML, пишет `server/src/api-schema.d.ts` (модели API сервера)
4. `tsc -b && vite build` (в `web/`) собирает фронтенд с использованием сгенерированных типов
5. `tsc` (в `server/`) собирает бекенд; `server/src/types.ts` — алиасы на сгенерированные модели

`web/src/lib/api/schema.d.ts`, `server/src/api-schema.d.ts` и `contract/tsp-output/` — сгенерированные файлы. Не редактировать вручную. Корневой `npm run build` выполняет все пять шагов по порядку (через `npm run generate`).

Бекенд **не** генерируется из TypeSpec (нет эмиттера для Fastify): маршруты и логика написаны вручную и проверяются тестами. Модели API генерируются и используются сервером, поэтому расхождение моделей с контрактом ломает `tsc` на шаге `build:server`.

## Архитектура

- **contract/** — TypeSpec как источник истины (`main.tsp`). Все модели и маршруты API определены здесь. `tspconfig.yaml` генерирует OpenAPI 3.1 YAML.
- **server/** — Fastify 5 + TypeScript (ESM). Раздаёт API на `/api/*` и статику фронтенда на `/` в production. Хранилище в памяти (`Map`), сбрасывается при перезапуске. `storage.seed()` создаёт 3 типа встреч по умолчанию при запуске. `storage.reset()` очищает всё состояние (используется в тестах).
- **web/** — React 19 + Vite 8 + Tailwind 4. Использует `openapi-fetch` с сгенерированными типами для типобезопасных вызовов API. TanStack Query для загрузки данных.

## Ключевые файлы

- `server/src/config.ts` — спецификационные константы (часовой пояс Europe/Moscow UTC+3, рабочие часы 09:00-18:00, окно 14 дней, шаг слотов 15 мин). Менять бизнес-правила здесь.
- `server/src/types.ts` — алиасы на сгенерированные модели API плюс ручной класс `ApiError`. Не дублировать модели руками.
- `server/src/services/booking.ts` — создание записи под мьютексом. Вся логика пересечений и конкурентности здесь.
- `server/src/services/availability.ts` — генерация слотов для окна в 14 дней.
- `server/src/services/time-window.ts` — единый расчёт границ Owner timezone (Booking window, Working hours, конверсии дат). Арифметику пояса менять здесь.
- `server/tests/helpers.ts` — хелперы `createTestApp()` и `createMeetingType()`. Тесты используют `inject()` Fastify (без реального порта).
- `contract/main.tsp` — TypeSpec-контракт. Спецификационные константы задокументированы в строке `@doc`.

## Подводные камни

- **ESM-импорты**: все исходные файлы сервера используют расширение `.js` в путях импорта (например, `./config.js`). Это требование Node ESM, а не опечатка.
- **Синтаксис TypeSpec**: `@service` использует синтаксис `#{title: "..."}` (hash-brace), а не обычный `{}`.
- **STATIC_DIR env**: в production сервер ищет ассеты фронтенда по `STATIC_DIR` (абсолютный путь). В Docker: `/app/web/dist`. Для локального production-запуска укажите абсолютный путь, иначе разрешается относительно `server/dist/`.
- **Vite proxy**: dev-режим работает на двух серверах. Vite (:5173) проксирует `/api` на Fastify (:3000). Оба должны быть запущены.
- **Конкурентность**: `async-mutex` оборачивает проверку и создание записи. Тесты проверяют: 2 и 5 одновременных запросов на один слот дают ровно 1 успех.
- **Без базы данных**: данные хранятся в памяти процесса. Это не баг — ограничение описано в README.md.
- **Путь вывода TypeSpec**: OpenAPI YAML попадает в `contract/tsp-output/@typespec/openapi3/openapi.yaml` (стандартная структура вывода TypeSpec).
- **Кодировка файла задачи**: `Описание задачи.txt` в кодировке Windows-1251. Читать в этой кодировке, не UTF-8.

## Зависимости (запиннены)

Экосистема TypeSpec — единая версия `1.18.0` (`@typespec/compiler`, `@typespec/openapi3`, `@typespec/http`). `@typespec/rest` — `0.88.0`. Vite 8, React 19, Fastify 5.

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues in `andrey769967/ai-for-developers-project-386`, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical triage roles, each mapped to a label string of the same name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` plus `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Условия комитов
Коммит реализации ссылается на тикет, который он закрывает, например feat: запись на свободный слот (#12)
