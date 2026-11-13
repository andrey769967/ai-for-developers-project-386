# Платформа для демо-стенда: Render, Railway или Fly.io

Research к тикету [#15](https://github.com/andrey769967/ai-for-developers-project-386/issues/15), карта [#11](https://github.com/andrey769967/ai-for-developers-project-386/issues/11).

- Дата: 2026-11-13
- Все источники — первичные (документация и прайс-страницы провайдеров), прочитаны 2026-11-13.
- Документ фиксирует **решение о платформе**, а не инструкцию по деплою. Реализация — отдельная сессия после закрытия карты.

## Вопрос

Какую PaaS выбрать для публичного демо-стенда текущего приложения без managed БД? Сравнить Docker-деплой, бесплатный или дешёвый тир, засыпание инстанса, TLS и поддомен, регион, лимиты, простоту отката и перезапуска (in-memory сбрасывается при рестарте).

## Короткий ответ

**Fly.io**, регион `fra` (Франкфурт), одна Machine `shared-cpu-1x` с 512 MB RAM, `internal_port = 3000`, always-on (`min_machines_running = 1`).

Почему: холодный старт измеряется секундами, а не минутой; одна всегда включённая Machine на 512 MB во Франкфурте стоит примерно $4/мес, а счёт личного organization меньше $5 Fly.io списывает целиком — то есть стенд обходится в **$0** при наличии карты. Docker-образ собирается из уже существующего `Dockerfile` без переделок, конфигурация живёт в репозитории (`fly.toml`), сборки бесплатны.

Цена этого выбора: нужна банковская карта (настоящего free tier у Fly.io нет), деплой идёт через CLI/CI, а не «подключи репозиторий», откат — это повторный деплой старого образа, а не кнопка.

## Что требует приложение

Проверено по репозиторию, а не по описанию:

| Требование | Факт | Следствие для платформы |
| --- | --- | --- |
| Docker | `Dockerfile` в корне: multi-stage, `npm run build` (TypeSpec → OpenAPI → типы → Vite → tsc), рантайм `node:22-slim` | нужен провайдер, который собирает образ из корневого `Dockerfile` |
| Порт | `server/src/config.ts`: `port: 3000`, `host: "0.0.0.0"`; `process.env.PORT` **не читается** | на Render нужно выставить `PORT=3000` (по умолчанию там ждут 10000) или полагаться на автоопределение; Railway определяет порт сам; на Fly — `internal_port = 3000` |
| Статика | `STATIC_DIR=/app/web/dist` уже задан в `Dockerfile`; SPA-fallback в `server/src/index.ts` | переменных окружения при деплое не требуется |
| Состояние | in-memory `Map`, `storage.seed()` создаёт 3 MeetingType при старте (ADR-0001) | любой рестарт/деплой/остановка = чистый стенд; это принято, не дефект |
| Процессы | один процесс (ADR-0002), без воркеров и фоновых задач | достаточно одной Machine / одного инстанса |
| Healthcheck | отдельного `/health` нет; `/` отдаёт `index.html` (200), `/api/meeting-types` — 200 | healthcheck можно повесить на `/` или `/api/meeting-types` |
| БД | нет | managed Postgres/Redis не нужны и не должны попасть в счёт |

## Сравнение

| Критерий | Render | Railway | Fly.io |
| --- | --- | --- | --- |
| Docker-деплой | Язык «Docker», сборка BuildKit из `Dockerfile`, multi-stage и кэш слоёв; zero-downtime деплой | Автоматически находит `Dockerfile` в корне; свой путь — `RAILWAY_DOCKERFILE_PATH`; сборки бесплатны | `fly launch`/`fly deploy` использует существующий `Dockerfile` как есть; сборка в Depot/Fly builder бесплатна |
| Бесплатный/дешёвый тир | Free web service: 0.1 CPU / 512 MB, $0; 750 instance-часов на workspace в месяц | Free: $0 + $1 кредита в месяц; Hobby: $5/мес, включает $5 usage | Free tier нет; trial $1 на 7 дней; счёт личного organization < $5/мес списывается (нужна карта) |
| Сон и холодный старт | Засыпает через 15 мин без входящего трафика, просыпается ~1 мин, браузеру показывается loading page | Serverless (бывш. App-Sleeping) — **опция**: сон через 5–10 мин, первый запрос может вернуть 502 | `fly launch` пишет scale-to-zero: стоп по простою, старт по запросу; холодный старт ~2 с и больше, suspend — сотни мс |
| TLS и поддомен | `*.onrender.com`, managed TLS (Let's Encrypt + Google Trust Services), HTTP→HTTPS редирект | `*.up.railway.app` через «Generate Domain»; Let's Encrypt для своих доменов, автопродление | `*.fly.dev` автоматически; Let's Encrypt, `force_https = true`; первые 10 сертификатов на одно имя бесплатны |
| Регион | Oregon, Ohio, Virginia, Frankfurt, Singapore; регион нельзя сменить у существующего сервиса | US West, US East, Amsterdam, Singapore; регион меняется без даунтайма (кроме volume) | 17 регионов, включая `fra`, `ams`, `cdg`, `lhr`, `arn` |
| Лимиты | 750 instance-часов/мес, 5 GB трафика и 500 минут сборки на Hobby-workspace, один инстанс, нет shell и диска; Render может перезапустить Free в любой момент | Free: 0.5 GB RAM, 1 vCPU, 1 GB ephemeral, образ до 4 GB, $1 кредита; Free/Hobby могут попасть в «Limited Access» при высокой нагрузке | Оплата по факту: 256 MB — $2.19/мес, 512 MB — $3.69/мес (в дешёвых регионах), остановленная Machine — $0.15/GB rootfs/мес, egress $0.02/GB в EU |
| Откат и рестарт | Откат в один клик на предыдущий деплой; на Free доступны только **два** последних; рестарт из дашборда | Откат/Redeploy/ Restart из меню деплоя; образы хранятся 24 ч на Free/Trial, 72 ч на Hobby | `fly releases --image` → `fly deploy --image <ref>`; отдельной команды rollback нет, образы могут вычищаться; рестарт — `fly machine restart` |
| Сброс in-memory | при засыпании, рестарте, деплое | при рестарте, деплое, миграции хоста, сне (если включён) | при рестарте, деплое, остановке по простою |

## Render

Сильная сторона — самый простой путь к $0: подключить репозиторий, выбрать Docker, получить `onrender.com` с TLS и не думать о карте.

Что важно для демо-стенда:

- Free web service засыпает через 15 минут без входящего трафика. Пробуждение занимает **около минуты**, и всё это время посетитель видит loading page. Для публичной ссылки, по которой кликают из резюме или чата, это худшее свойство из трёх вариантов.
- Free-инстанс Render может перезапустить в любой момент; файловая система эфемерна, диск на Free недоступен. Для in-memory приложения это эквивалентно «стенд периодически чистый» — допустимо, но в паре с минутным холодным стартом неприятно.
- 750 instance-часов в месяц хватает на один сервис, но при исчерпании Render приостанавливает все Free-сервисы до начала следующего месяца.
- Откат на Free — только к двум последним деплоям, зато в один клик и без пересборки (переиспользуется build artifact).
- Порт: Render по умолчанию ждёт `PORT=10000`. Наш сервер слушает жёстко 3000 и `process.env.PORT` не читает, поэтому при деплое нужно явно задать `PORT=3000` (Render разрешает переопределить) либо понадеяться на автоопределение порта.
- Регион для аудитории в Москве — Frankfurt; сменить регион у уже созданного сервиса нельзя.

Источники: [Free](https://render.com/docs/free), [Pricing](https://render.com/pricing), [Docker](https://render.com/docs/docker), [Web Services / port binding](https://render.com/docs/web-services), [TLS](https://render.com/docs/tls), [Regions](https://render.com/docs/regions), [Rollbacks](https://render.com/docs/rollbacks).

## Railway

Сильная сторона — лучший DX: Dockerfile подхватывается сам, домен генерируется кнопкой, откат и рестарт — пункты меню, сборки бесплатны.

Что важно для демо-стенда:

- Настоящий Free-тир — это **$1 кредита в месяц** при ценах $10/GB RAM и $20/vCPU в месяц. Даже 512 MB, работающие круглосуточно, стоят около $5/мес, то есть кредита хватает на несколько дней, а не на месяц. Практическая цена всегда включённого стенда — **Hobby $5/мес** (включает $5 usage; при реальном потреблении Fastify-процесса счёт, скорее всего, останется в этих $5).
- Serverless (бывший App-Sleeping) выключен по умолчанию. Если его включить, сервис засыпает через 5–10 минут без исходящего трафика, а первый запрос может получить 502 — для демо лучше не включать.
- Free и Hobby могут быть временно деприоритизированы («Limited Access»): новые деплои ставятся в очередь, а Railway может сам пересоздать сервис при миграции хоста. Для стенда это означает редкие внезапные рестарты и сброс in-memory.
- Откат — кнопка в меню деплоя, но окно ограничено: 24 часа на Free/Trial, 72 часа на Hobby.
- Регион для Москвы — Amsterdam. Регион меняется без даунтайма, если нет volume.
- Порт Railway определяет сам, поэтому жёсткий 3000 в `config.ts` здесь не мешает.

Источники: [Pricing plans](https://docs.railway.com/reference/pricing/plans), [Free trial](https://docs.railway.com/reference/pricing/free-trial), [Serverless](https://docs.railway.com/reference/app-sleeping), [Dockerfiles](https://docs.railway.com/guides/dockerfiles), [Domains](https://docs.railway.com/networking/domains/working-with-domains), [Regions](https://docs.railway.com/reference/regions), [Deployments](https://docs.railway.com/reference/deployments).

## Fly.io

Сильная сторона — единственный вариант, где одновременно получаются быстрый холодный старт, близкий к нулю счёт и EU-регион.

Что важно для демо-стенда:

- **Free tier нет.** Новые организации — Pay As You Go, trial даёт $1 на 7 дней. Но если счёт личного organization за месяц меньше $5, он **списывается целиком** (нужна карта; waiver не действует на другие organization и не ограничивает счёт сверху).
- Цены (дешёвые регионы `iad`/`ewr`): `shared-cpu-1x` 256 MB — $2.19/мес, 512 MB — $3.69/мес, 1 GB — $6.70/мес. Во Франкфурте цены примерно на 15% выше (в примере из прайса 1 GB в `fra` — $7.73 против $6.70 в `iad`), то есть 512 MB в `fra` — около **$4/мес**, всё ещё ниже порога waiver, но запас тонкий. Остановленная Machine стоит $0.15/GB rootfs в месяц; egress в EU — $0.02/GB; shared IPv4 бесплатен.
- `fly launch` по умолчанию пишет scale-to-zero: `auto_stop_machines = "stop"`, `auto_start_machines = true`, `min_machines_running = 0`. Холодный старт из stopped — «около 2 секунд и больше», из suspended — сотни миллисекунд.
- Первый деплой без явных process groups создаёт **две** Machine «для отказоустойчивости». Две всегда включённые по 512 MB — это ~$7.7–8.5/мес, то есть уже больше $5 и счёт платится полностью. Для демо нужно `fly scale count 1` (и при желании `min_machines_running = 1`, чтобы единственная Machine не засыпала).
- Docker: `fly launch` в проекте с готовым `Dockerfile` использует его как есть (Dockerfile-сканер). `fly deploy` собирает образ в бесплатном builder'е. Конфигурация — `fly.toml` в репозитории, то есть версионируется вместе с кодом.
- Домен `*.fly.dev` выдаётся автоматически, TLS — Let's Encrypt, `force_https = true` включает редирект. Первые 10 сертификатов на одно имя бесплатны.
- Откат: отдельной команды нет. `fly releases --image` показывает историю образов, `fly deploy --image registry.fly.io/<app>:<tag>` поднимает старый. Важно: Fly **не гарантирует** вечное хранение образов — неиспользуемые могут вычищаться. Для демо это приемлемо, но если нужен надёжный откат, стоит тегировать сборки (`--image-label <sha>`) и/или пушить образ в GHCR.
- Рестарт — `fly machine restart`; любой рестарт/деплой/остановка сбрасывают in-memory, что совпадает с ADR-0001.
- Регион для Москвы — `fra` (или `ams`); в отличие от Render, регион у Fly выбирается при создании, но приложение можно пересоздать в другом регионе без переделки конфигурации.

Источники: [Resource pricing](https://docs.fly.io/about/pricing), [Free waiver](https://docs.fly.io/about/free-waiver), [Autostop/autostart](https://docs.fly.io/launch/autostop-autostart), [Fly Proxy autostop/autostart](https://docs.fly.io/reference/fly-proxy-autostop-autostart), [Deploy an app](https://docs.fly.io/launch/deploy), [Create with Fly Launch](https://docs.fly.io/launch/create), [fly.toml reference](https://docs.fly.io/reference/configuration), [Custom domains](https://docs.fly.io/networking/custom-domain), [Regions](https://docs.fly.io/reference/regions), [Roll back a deploy](https://docs.fly.io/blueprints/rollback-guide), [fly deploy](https://docs.fly.io/flyctl/cmd/fly_deploy), [fly machine restart](https://docs.fly.io/flyctl/cmd/fly_machine_restart), [fly releases](https://docs.fly.io/flyctl/cmd/fly_releases).

## Решение

**Fly.io.** Ключевые аргументы в порядке важности:

1. **Демо открывается сразу.** Render на Free отдаёт ссылку, которая после 15 минут простоя минуту «крутится». Fly.io с одной всегда включённой Machine не спит вообще, а если разрешить autostop — просыпается за секунды. Для публичного стенда это главное.
2. **Эффективно $0.** Одна Machine 512 MB во Франкфурте — около $4/мес, счёт меньше $5, значит списывается. Railway в сопоставимом режиме (always-on) стоит $5/мес, Render бесплатен, но спит.
3. **Регион рядом с аудиторией.** `fra`/`ams` дают нормальную задержку для Москвы; у Render тоже есть Frankfurt, у Railway — Amsterdam, так что это не решающий, но подтверждающий фактор.
4. **Конфигурация в репозитории.** `fly.toml` версионируется, `Dockerfile` переиспользуется как есть, сборки бесплатны. Это лучше сочетается с одноразовым демо-стендом, чем настройки в дашборде.
5. **Откат и рестарт достаточны.** Для стенда, где состояние и так сбрасывается, «передеплой старого образа» и `fly machine restart` покрывают потребность; цена — чуть больше ручной работы, чем одна кнопка.

### Почему не Render

Единственная причина против — минутный холодный старт после 15 минут простоя, ровно в сценарии «кинули ссылку в чат». Плюс Free может быть перезапущен в любой момент и откат ограничен двумя деплоями. Если карту добавлять нельзя и минутное ожидание приемлемо — Render остаётся самым дешёвым и простым запасным вариантом.

### Почему не Railway

Настоящая цена always-on стенда — $5/мес (Hobby), потому что $1 кредита на Free не покрывает даже 512 MB. За эти деньги Railway даёт лучший DX и откат в один клик, но Fly.io при сопоставимом или меньшем счёте выигрывает по «бесплатности» и не уступает по холодному старту.

## Что это значит для деплоя (не реализация)

Ориентир для следующей сессии, чтобы решение было проверяемым:

```toml
# fly.toml (эскиз, не финальный файл)
app = "call-booking-demo"
primary_region = "fra"

[build]
  # Dockerfile в корне репозитория подхватывается автоматически

[http_service]
  internal_port = 3000          # server/src/config.ts слушает 3000
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 1      # единственная Machine не засыпает

[[http_service.checks]]
  path = "/api/meeting-types"   # отдельного /health нет
  interval = "30s"
  timeout = "5s"
  grace_period = "10s"
```

- `fly scale count 1` — иначе первый деплой создаст две Machine, счёт превысит $5 и waiver не сработает.
- `fly scale vm shared-cpu-1x --memory 512` — 512 MB достаточно для Node 22 + Fastify; 256 MB дешевле, но без запаса.
- Секреты, volumes и managed-сервисы не нужны: `STATIC_DIR` уже в образе, БД нет.
- Push-to-deploy делается GitHub Action с `superfly/flyctl-actions` (или `fly deploy` вручную); «подключи репозиторий» у Fly.io нет.
- Проверка стоимости после первого месяца: дашборд Fly → Billing. Если счёт перевалил за $5, он платится полностью, а не частично.

## Риски и открытые вопросы

- **Карта обязательна.** Waiver — не free tier, а политика «счёт меньше $5 не выставляем»; она действует только на личный organization и не ограничивает счёт сверху. Если карта неприемлема — Fallback на Render Free.
- **Тонкий запас до $5.** 512 MB в `fra` — около $4/мес; 1 GB или заметный egress выводят за порог, и тогда платится вся сумма. Нужно оставаться на одной Machine и 512 MB.
- **Откат не гарантирован навсегда.** Образы могут вычищаться из registry Fly. Для демо достаточно, для «настоящего» отката — теги `--image-label <sha>` и/или GHCR.
- **Сброс состояния.** Любой рестарт/деплой/остановка обнуляет Booking'и и заново создаёт 3 MeetingType. Это соответствует ADR-0001 и скоупу демо; в README стоит явно написать «данные сбрасываются».
- **Нет региона в РФ.** Ближайшие — Франкфурт/Амстердам; для демо задержка приемлема.
- **Один регион и одна Machine** — единая точка отказа. Для демо это осознанный компромисс; множить Machine нельзя, иначе счёт > $5.
- **Порт 3000 зашит в код.** На Fly это решается `internal_port`, но если в будущем появится требование читать `process.env.PORT`, это отдельная задача (и она же упростит перенос на Render).

## Источники

Все ссылки открыты 2026-11-13.

**Render**
- https://render.com/docs/free — Free web services: 15-минутный простой, ~1 мин пробуждение, 750 instance-часов, перезапуски, эфемерная ФС, откат к двум деплоям.
- https://render.com/pricing — Hobby $0 + compute, Free 512 MB, 5 GB трафика, 500 минут сборки, Docker builds.
- https://render.com/docs/docker — сборка из Dockerfile, multi-stage, кэш слоёв.
- https://render.com/docs/web-services — порт `0.0.0.0`, `PORT` по умолчанию 10000.
- https://render.com/docs/tls — managed TLS и HTTPS-редирект.
- https://render.com/docs/regions — пять регионов, включая Frankfurt; смена региона недоступна.
- https://render.com/docs/rollbacks — откат, build retention, ограничения Free.

**Railway**
- https://docs.railway.com/reference/pricing/plans — Free $1 кредита/мес, Hobby $5/мес, цены RAM/CPU/egress, лимиты, retention образов.
- https://docs.railway.com/reference/pricing/free-trial — trial $5 на 30 дней и переход на Free.
- https://docs.railway.com/reference/app-sleeping — Serverless: 5–10 минут, 502 на первом запросе.
- https://docs.railway.com/guides/dockerfiles — автоподхват корневого Dockerfile.
- https://docs.railway.com/networking/domains/working-with-domains — `up.railway.app`, Let's Encrypt.
- https://docs.railway.com/reference/regions — четыре региона, включая Amsterdam.
- https://docs.railway.com/reference/deployments — rollback/restart/redeploy, эфемерное хранилище, миграции хоста, Limited Access.

**Fly.io**
- https://docs.fly.io/about/pricing — цены Machine, stopped rootfs, egress, сертификаты, отсутствие free tier.
- https://docs.fly.io/about/free-waiver — waiver для счетов < $5, условия, отсутствие cap.
- https://docs.fly.io/launch/autostop-autostart — scale-to-zero по умолчанию, ~2 с холодный старт, suspend.
- https://docs.fly.io/reference/fly-proxy-autostop-autostart — как Fly Proxy останавливает и запускает Machine.
- https://docs.fly.io/launch/deploy — `fly deploy`, выбор образа, стратегии, smoke checks, две Machine на первом деплое.
- https://docs.fly.io/launch/create — `fly launch` и существующий Dockerfile.
- https://docs.fly.io/reference/configuration — `fly.toml`: `http_service`, `internal_port`, `force_https`, checks.
- https://docs.fly.io/networking/custom-domain — `fly.dev`, Let's Encrypt, `fly certs`.
- https://docs.fly.io/reference/regions — список регионов, включая `fra` и `ams`.
- https://docs.fly.io/blueprints/rollback-guide — откат через `fly releases --image` и `fly deploy --image`, риск вычищения образов.
- https://docs.fly.io/flyctl/cmd/fly_deploy — флаги `--image`, `--image-label`, `--strategy`.
- https://docs.fly.io/flyctl/cmd/fly_machine_restart — рестарт Machine.
- https://docs.fly.io/flyctl/cmd/fly_releases — история релизов и образов.
