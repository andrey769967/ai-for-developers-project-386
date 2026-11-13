# Changelog

## 1.0.0 (2026-11-13)


### Features

* **check:** проверять артефакты, SDK и живой сервер ([#42](https://github.com/andrey769967/ai-for-developers-project-386/issues/42)) ([4484947](https://github.com/andrey769967/ai-for-developers-project-386/commit/4484947e90a8f9467014570fe67b94813c391785))
* **ci:** сквозной браузерный сценарий и единая команда проверок ([#33](https://github.com/andrey769967/ai-for-developers-project-386/issues/33)) ([598012e](https://github.com/andrey769967/ai-for-developers-project-386/commit/598012ed0b0a52aaabb515cc4944fc84a5025a23))
* **contract:** объявить ограничения Duration и привязать максимум к рабочему дню ([6211648](https://github.com/andrey769967/ai-for-developers-project-386/commit/62116485fa7803a73d5ec3cf387044400a995abc))
* **deploy:** описать публичный стенд на Render Free ([#38](https://github.com/andrey769967/ai-for-developers-project-386/issues/38)) ([a8a5bf3](https://github.com/andrey769967/ai-for-developers-project-386/commit/a8a5bf33b919e3ee4c42004351aa20e117fc8bde))
* initial commit - call booking app (contract, server, web) ([9d6d039](https://github.com/andrey769967/ai-for-developers-project-386/commit/9d6d039ee3d792a4793d05d17f0e402ef7eaf8ab))
* **mcp:** подключить Playwright MCP для агента ([#39](https://github.com/andrey769967/ai-for-developers-project-386/issues/39)) ([3e0d048](https://github.com/andrey769967/ai-for-developers-project-386/commit/3e0d04834c5f95096c1dd3ddc2165a7303d92323))
* **server:** генерировать модели API из контракта ([c80ed51](https://github.com/andrey769967/ai-for-developers-project-386/commit/c80ed5154ca5b3b667420819721befe854b8785b)), closes [#6](https://github.com/andrey769967/ai-for-developers-project-386/issues/6)
* **server:** перевести сообщения об ошибках на русский ([65d6b15](https://github.com/andrey769967/ai-for-developers-project-386/commit/65d6b156c5320240aac6964c73967573e4910b72))
* **server:** собрать приложение в одну фабрику и добавить /health ([89a3a5c](https://github.com/andrey769967/ai-for-developers-project-386/commit/89a3a5c7707f0f14b2268906622bb2b22bce519d))
* **web:** задавать Duration вводом вместо четырёх кнопок ([80c361d](https://github.com/andrey769967/ai-for-developers-project-386/commit/80c361d12d221d02398a5a0020a5c1973bc3eea1))
* **web:** показывать весь Booking window в календаре гостя ([4b7d869](https://github.com/andrey769967/ai-for-developers-project-386/commit/4b7d86926f847cba790751d179428f7511b2d03e))
* запускать демо одной командой через Docker Compose ([658a223](https://github.com/andrey769967/ai-for-developers-project-386/commit/658a223b8f2f03b2030411d972b77fe1ee92b883))


### Bug Fixes

* **bookings:** фильтр Upcoming в GET /api/bookings и тесты правил создания ([b388d8d](https://github.com/andrey769967/ai-for-developers-project-386/commit/b388d8d69162ea74336cee56f7690c7a3aac00a9)), closes [#2](https://github.com/andrey769967/ai-for-developers-project-386/issues/2) [#8](https://github.com/andrey769967/ai-for-developers-project-386/issues/8)
* **booking:** считать Booking window от полуночи Owner timezone ([06bf32d](https://github.com/andrey769967/ai-for-developers-project-386/commit/06bf32d0cb60569544f5a1d73558ef465d9224f7)), closes [#3](https://github.com/andrey769967/ai-for-developers-project-386/issues/3)
* **ci:** экранировать двоеточие в имени шага ([#33](https://github.com/andrey769967/ai-for-developers-project-386/issues/33)) ([d0cf3b8](https://github.com/andrey769967/ai-for-developers-project-386/commit/d0cf3b84a3ec09638b19fc12a7fc5629f5d017d2))
* **meeting-types:** 409 на удалении MeetingType с существующими Booking ([021df8b](https://github.com/andrey769967/ai-for-developers-project-386/commit/021df8b06b20f4ee158ce3c45e3018a0f663c316)), closes [#7](https://github.com/andrey769967/ai-for-developers-project-386/issues/7)
* привести /health к контракту и ужесточить фабрику ([f2849dd](https://github.com/andrey769967/ai-for-developers-project-386/commit/f2849dd6845d4a2c238086515c44e6f198bd4011))
