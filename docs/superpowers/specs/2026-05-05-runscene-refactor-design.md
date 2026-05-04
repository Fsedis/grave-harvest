# Дизайн рефактора RunScene

Дата: 2026-05-05

## Контекст

`Grave Harvest` уже имеет законченную MVP-основу и реализованный слой синергий для `v0.2.0`. Доменные тесты, typecheck и production build проходят. Главный технический риск перед следующим контентом - `src/game/RunScene.ts`: файл вырос до 3000+ строк и совмещает Phaser lifecycle, игровой цикл, оружие, врагов, pickups, HUD, меню, настройки, meta-upgrades, экраны результата, визуальные эффекты и debug overlay.

Рефактор нужен не ради чистоты сам по себе, а чтобы дальнейшие фичи добавлялись точечно и с меньшим риском сломать существующий feel забега.

## Цель

Разобрать `RunScene` на понятные игровые модули без изменения геймплея, баланса, save-формата, управления, UI copy и визуального ритма.

После рефактора `RunScene` должен остаться координатором:

- создаёт Phaser scene и группы;
- держит статус забега и основные переходы между состояниями;
- связывает подсистемы между собой;
- передаёт подсистемам state snapshots и callbacks;
- не содержит весь HUD, overlays, combat и FX в одном файле.

## Не Цели

- Не менять баланс оружия, врагов, синергий, Captain fight или drop rates.
- Не добавлять новый контент.
- Не менять `localStorage` save key и структуру сохранения.
- Не переписывать игру на другой engine/framework.
- Не пытаться покрыть Phaser-heavy UI искусственными unit-тестами, если такие тесты будут хрупкими.

## Архитектура

Планируемые границы модулей:

- `src/game/formatters/*`: чистое форматирование времени, rarity labels, weapon HUD lines, synergy summary, texture names, css colors.
- `src/game/overlays/*`: main menu, pause, level-up, game over, victory, settings, meta-upgrades и reset-progress confirm.
- `src/game/hud/*`: HP/XP/timer/bones/kills/level, weapon panel, synergy panel, boss bar, balance debug overlay и responsive layout.
- `src/game/combat/*`: weapon firing, projectiles, timed damage, synergy combat effects и projectile update.
- `src/game/entities/*`: enemy spawning/runtime helpers, scripted spawns, pickups, entity cleanup.
- `src/game/fx/*`: bursts, rings, damage numbers, screen shake и world text.

`RunScene` будет отдавать модулям минимально нужные зависимости: Phaser scene, группы, текущий run/save state, callbacks и настройки. Модули не должны самостоятельно владеть глобальным состоянием забега, если это состояние уже принадлежит сцене.

## Порядок Работы

Рефактор идёт от минимального риска к максимальному:

1. Вынести чистые formatters и UI helpers.
2. Вынести overlay primitives: создание текста, прямоугольников, кнопок и очистку overlay-объектов.
3. Вынести HUD controller: layout/update HUD, weapon/synergy panel, boss bar и balance debug.
4. Вынести экраны overlays: menu, pause, level-up, game over, victory, settings, meta upgrades.
5. Вынести combat systems: weapon firing, projectiles, status effects и synergy effects.
6. Вынести entity/fx helpers, если после combat extraction границы будут достаточно ясны.

Каждый шаг должен быть небольшим и проверяемым. Если перенос начинает требовать изменения поведения, он останавливается и пересматривается отдельно.

## Обработка Ошибок И Состояний

Рефактор не должен добавлять новые user-facing error flows. Внутренние ошибки сохраняют текущую модель: неизвестное оружие, враг или upgrade продолжает падать явно через существующие helper-функции.

Callbacks из overlay/HUD модулей должны оставаться простыми и явными: `startRun`, `resumeRun`, `showSettings`, `pickUpgrade`, `buyMetaUpgrade`, `resetProgress` и похожие действия. Это снижает риск скрытых переходов статуса внутри UI-модулей.

## Тестирование

Автоматические проверки после каждого крупного переноса:

- `npm test`
- `npm run typecheck`
- `npm run build`

Unit-тесты добавляются для чистой логики:

- формат времени;
- rarity/card labels;
- weapon HUD lines;
- synergy summary/lines;
- любые вынесенные чистые расчёты combat effects.

Phaser-heavy модули проверяются через typecheck/build и ручной smoke, чтобы не создавать хрупкие тесты вокруг отрисовки.

## Ручной Smoke

После UI/HUD/overlay шагов:

- новый забег стартует из меню;
- WASD/стрелки двигают игрока;
- level-up показывает 3 карты и принимает мышь/клавиши `1`, `2`, `3`;
- pause/resume/settings работают через `Esc` и кнопки;
- game over показывает результаты, кости и синергии;
- victory после Captain показывает результаты, кости и синергии;
- meta upgrades покупаются и сохраняются;
- reset progress не ломает settings/save;
- `?debug=balance` показывает debug overlay;
- активные синергии отображаются в HUD.

После combat/entity/fx шагов дополнительно:

- все 4 оружия стреляют/тикают/пульсируют как раньше;
- все 6 синергий механически заметны;
- timed damage, bleed, burn и flame burst работают;
- Captain появляется после 10:00 и победа засчитывается только после убийства Captain.

## Критерии Готовности

- `RunScene.ts` заметно сокращён и больше не содержит весь HUD, overlays, combat и FX в одном файле.
- Поведение игрока не меняется: управление, оружие, синергии, победа/смерть, meta-progression и настройки работают как раньше.
- Все автоматические проверки проходят.
- `?debug=balance` остаётся рабочим.
- Следующий контентный шаг можно добавить без правки нескольких тысяч строк в одном файле.

## Риски

- Combat extraction может незаметно изменить feel оружия, timing или collision behavior.
- Overlay extraction может сломать callbacks и переходы статуса.
- HUD extraction может ухудшить responsive layout на узких экранах.
- Слишком широкий перенос за один шаг усложнит поиск регрессии.

Снижение рисков: двигаться маленькими переносами, запускать проверки после каждого шага и оставлять поведение неизменным до завершения рефактора.
