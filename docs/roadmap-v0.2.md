# Grave Harvest Roadmap v0.2

## Цель версии

`v0.2.0` должна стать крупным публичным demo-патчем, который заметно повышает replayability через глубину билдов. Главная идея версии: игроку должно быть интересно возвращаться в новые забеги не только ради мета-прогрессии, но и ради разных сочетаний оружия.

Фокус версии — build depth через 6 weapon-pair synergy cards для текущих 4 оружий:

- Bone Knives
- Holy Candle
- Grave Bell
- Crow Swarm

Новые оружия, новые враги, backend, аккаунты, leaderboard и мобильное управление не входят в `v0.2.0`.

## Ключевая фича: weapon-pair synergies

В `v0.2.0` у каждой пары текущих оружий появляется отдельная rare synergy-карта. Карта появляется в level-up pool только когда игрок уже владеет обоими оружиями пары. Синергия выбирается вручную, имеет `maxStacks: 1` и должна заметно менять поведение билда, а не быть только численным бонусом.

Целевые синергии:

1. Bone Knives + Holy Candle: ножи накладывают burn.
2. Bone Knives + Grave Bell: ножи получают pierce.
3. Bone Knives + Crow Swarm: вороны накладывают bleed, а ножи сильнее бьют bleeding-врагов.
4. Holy Candle + Grave Bell: Grave Bell вызывает дополнительный candle/burn-эффект в радиусе.
5. Holy Candle + Crow Swarm: вороны создают flame burst при попадании.
6. Grave Bell + Crow Swarm: каждый bell pulse выпускает бонусную ворону.

Синергии должны быть читаемыми: игрок по названию, описанию и эффекту в бою понимает, почему билд стал другим.

## UX и визуальный объём

`v0.2.0` не включает полноценный art pass. Визуальная работа ограничивается UI/FX polish вокруг новых билдов:

- synergy-карты визуально отличаются от обычных rare-карт;
- активные синергии видны в HUD или pause screen;
- эффекты синергий сопровождаются понятными ring/burst/tint feedback;
- damage feedback остаётся читаемым даже при нескольких активных синергиях;
- game over и victory screen показывают активные синергии забега.

Generated/simple art остаётся допустимым для этой версии.

## Milestones

### 1. Synergy foundation

- Добавить модель synergy definitions.
- Расширить requirements upgrade-карт поддержкой пары оружий.
- Добавить helpers для проверки активных синергий.
- Покрыть domain-тестами доступность synergy-карт и `maxStacks: 1`.
- Подготовить `RunScene` к чтению synergy flags без большого рефактора сцены.

### 2. First playable synergy slice

- Реализовать первые 3 синергии:
  - Bone Knives + Holy Candle
  - Bone Knives + Grave Bell
  - Grave Bell + Crow Swarm
- Добавить базовые visual feedback-эффекты.
- Проверить, что каждую синергию можно собрать в обычном level-up flow.

### 3. Full synergy set

- Реализовать оставшиеся 3 синергии:
  - Bone Knives + Crow Swarm
  - Holy Candle + Grave Bell
  - Holy Candle + Crow Swarm
- Добавить отображение активных синергий в HUD или pause screen.
- Убедиться, что все 6 синергий достижимы и не конфликтуют с существующими weapon-upgrades.

### 4. Balance pass

- Настроить урон, cooldown, radius и proc-эффекты синергий.
- Сохранить текущие ориентиры `v0.1.0`:
  - полный забег остаётся около уровня 23-28;
  - Captain после 10:00 не становится тривиальным;
  - минимум 4 разных билда ощущаются жизнеспособными.
- Проверить `?debug=balance` после добавления синергий.

### 5. Public demo release

- Обновить версию проекта до `0.2.0`.
- Обновить README и `RELEASE_NOTES.md`.
- Провести smoke-test обычного запуска и debug-режима.
- Собрать production build для публичного demo/itch-релиза.

## Проверка готовности

Перед релизом `v0.2.0` должны проходить:

```bash
npm test
npm run typecheck
npm run build
```

Ручная проверка:

- новый save стартует корректно;
- все 4 оружия можно открыть;
- все 6 synergy-карт появляются при нужных парах оружия;
- каждая синергия визуально и механически заметна в бою;
- pause, settings, game over и victory screens работают после забега с синергиями;
- reset progress не ломает save/settings.

## Не входит в v0.2.0

- новые weapons;
- новые enemies или bosses;
- полноценный art pass;
- мобильное управление;
- backend, аккаунты, leaderboard;
- save migration;
- большой архитектурный рефактор `RunScene`.

## Технические риски

- `RunScene` уже крупный, поэтому новые эффекты нужно добавлять точечно и выносить только ту domain-логику, которая нужна синергиям.
- Синергии могут быстро сломать баланс Captain fight, поэтому balance pass обязателен.
- Визуальные эффекты синергий не должны ухудшать читаемость врагов, pickups и damage numbers.
