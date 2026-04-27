# Grave Harvest

Браузерный 2D top-down autoshooter roguelite про проклятого смотрителя кладбища.

Игрок выживает на кладбищенской арене, автоматически атакует нежить, собирает души для level-up, выбирает проклятия и тратит кости на постоянные улучшения между забегами.

## Статус

`v0.1.0` — первая завершенная MVP-версия.

В игре уже есть:

- 10-минутная ночь с финальным Bone Knight Captain;
- победа только после убийства Captain после 10:00;
- 4 оружия: костяные ножи, святая свеча, могильный колокол, стая ворон;
- 5 типов врагов;
- run-upgrades, weapon-upgrades и rare-эффекты;
- кости, localStorage-save и 5 постоянных улучшений;
- pause, settings, first-run hints, game over и victory screens;
- WebAudio SFX и простой ambient loop;
- debug overlay для балансировки через `?debug=balance`.

## Управление

- `WASD` или стрелки — движение.
- `Esc` — пауза / назад.
- `1`, `2`, `3` — выбор карты на level-up.
- Мышь — UI-кнопки и выбор карт.

Оружие стреляет автоматически. Игрок управляет позицией, сбором опыта и выбором усилений.

## Запуск

```bash
npm install
npm run dev
```

По умолчанию dev server поднимается на:

```text
http://127.0.0.1:5173/
```

Debug-режим для балансировки:

```text
http://127.0.0.1:5173/?debug=balance
```

## Скрипты

```bash
npm test          # Vitest доменные тесты
npm run typecheck # TypeScript без emit
npm run build     # production build
```

## Технически

- TypeScript
- Vite
- Phaser 3
- Vitest
- WebAudio без внешних звуковых ассетов
- localStorage save key: `grave_harvest_save_v1`

Backend, аккаунты, лидерборды и онлайн-сервисы не используются.
