# Grave Harvest Roadmap

Статус на 2026-04-28: публичный репозиторий создан, в `main` лежит первый grey prototype.

## Текущая версия: v0.1 Grey Prototype

Уже есть:
- Vite + TypeScript + Phaser + Vitest.
- Меню, старт забега, HUD, pause, game over и retry.
- Движение игрока по арене.
- Skeleton spawn director, движение врагов к игроку и контактный урон.
- Bone Knives с автоматическим таргетингом.
- Все 4 MVP-оружия: Bone Knives, Holy Candle, Grave Bell, Crow Swarm.
- Все 5 MVP-врагов в забеге: Skeleton, Grave Rat, Rot Walker, Ghost, Bone Knight.
- Scripted Bone Knight на 5:00 и Bone Knight Captain на 10:00.
- Победа только после убийства финального Bone Knight Captain.
- Victory screen и boss HP bar.
- Damage-radius rings для Holy Candle и Grave Bell совпадают с реальным радиусом урона.
- Damage numbers с лимитом, low HP warning и level-up flash.
- XP pickups, сбор опыта, level-up экран с 3 картами.
- Базовые run-upgrades и weapon-specific upgrades.
- Basic rarity weighting для карт: common, uncommon, rare.
- Чистая доменная логика с тестами.

Ограничения версии:
- Нет полного 10-минутного режима.
- Нет мета-прогрессии, настроек, звуков и финального juice.
- Визуал намеренно серый и прототипный.

## Принципы разработки

- Сначала приятный loop, потом контент.
- Любая фича должна усиливать цикл: движение -> убийство -> XP -> апгрейд -> новая попытка.
- Декор не должен мешать читаемости.
- Сложность растет по таймеру, а не через внезапные нечестные ситуации.
- Каждый этап должен оставлять игру запускаемой и играбельной.

## Этап 1: Playable Vertical Slice

Цель: сделать 2-3 минуты игры, которые уже ощущаются как Grave Harvest.

- [ ] Улучшить feel движения игрока.
- [x] Настроить первые 2 минуты spawn curve.
- [x] Добавить Grave Rat в игровой спавн.
- [x] Добавить Rot Walker в игровой спавн.
- [x] Добавить простую separation-логику врагов.
- [x] Добавить hit flash, death burst и pickup burst.
- [x] Довести первый level-up до 30-60 секунд у среднего игрока.
- [x] Добавить читаемые weapon icons в HUD.
- [x] Добавить первый балансный проход по HP, урону и XP.

Definition of Done:
- Игрок за первые 2 минуты получает минимум 2 level-up.
- Враги различаются по силуэту/цвету.
- Смерть ощущается как результат давления, а не случайность.

## Этап 2: MVP Combat Content

Цель: довести run-контент до минимального набора из PRD.

- [x] Реализовать Holy Candle.
- [x] Реализовать Grave Bell.
- [x] Реализовать Crow Swarm.
- [x] Добавить Ghost с волнообразным движением.
- [x] Добавить Bone Knight как элиту.
- [x] Добавить Bone Knight Captain на 10:00.
- [x] Добавить weapon-specific upgrades.
- [x] Довести список run-upgrades минимум до 20 карт.
- [x] Добавить basic rarity weighting: common, uncommon, rare.

Definition of Done:
- Игрок может иметь до 4 оружий.
- Все MVP-враги встречаются в забеге.
- Апгрейды реально меняют стиль выживания.

## Этап 3: Full Night Mode

Цель: сделать полноценный 10-минутный забег.

- [x] Добавить финального босса на 10:00 и победу после его убийства.
- [x] Добавить victory screen.
- [ ] Настроить 10-минутную budget curve.
- [x] Добавить scripted spawn элит на 5:00 и 10:00.
- [x] Добавить boss HP bar.
- [x] Синхронизировать AoE-визуал Holy Candle и Grave Bell с реальным damage radius.
- [ ] Добавить hard caps для врагов, снарядов и pickups.
- [ ] Добавить pickup merging при переполнении лимита.
- [ ] Проверить повторный запуск нескольких забегов подряд.

Definition of Done:
- Забег можно пройти от 0:00 до 10:00 без перезагрузки страницы.
- Death и victory оба корректно завершают run.
- Retry стабильно сбрасывает состояние.

## Этап 4: Bones And Meta Progression

Цель: добавить причину запускать следующий забег.

- [ ] Добавить bones drops в gameplay.
- [ ] Реализовать retention по времени смерти.
- [ ] Добавить localStorage save key `grave_harvest_save_v1`.
- [ ] Добавить Permanent Upgrades screen.
- [ ] Реализовать 5 meta-upgrades:
  - стартовое здоровье;
  - стартовый урон;
  - pickup radius;
  - rare upgrade chance;
  - bone retention.
- [ ] Добавить reset progress.
- [ ] Добавить stats: total runs, wins, best time, total kills, total bones earned.

Definition of Done:
- После смерти игрок получает сохраненные bones.
- Купленные meta-upgrades влияют на следующий забег.
- Прогресс переживает refresh страницы.

## Этап 5: Juice And UX

Цель: превратить прототип в приятную аркадную мясорубку.

- [x] Добавить damage numbers с лимитом, без настройки on/off.
- [x] Добавить low HP warning.
- [x] Добавить level-up flash.
- [ ] Добавить screen shake с настройкой on/off.
- [ ] Добавить damage numbers с настройкой on/off.
- [ ] Добавить level-up sting.
- [ ] Добавить SFX для shot, hit, death, pickup, level-up, player hit.
- [ ] Добавить простую ambient/music loop.
- [ ] Улучшить pause screen.
- [ ] Добавить settings screen.
- [ ] Улучшить визуальную читаемость арены.
- [ ] Добавить короткие first-run hints.

Definition of Done:
- Убийства, pickup и level-up дают явный feedback.
- HUD не перекрывает важную игровую зону.
- Игрок без объяснений понимает, что делать.

## Этап 6: MVP Balance And Release

Цель: собрать первую законченную MVP-версию.

- [ ] Настроить целевую длительность первого проигрыша: 4-7 минут.
- [ ] Настроить хороший 10-минутный забег: 800-1200 kills, level 23-28.
- [ ] Проверить FPS при 180 активных врагах.
- [ ] Проверить death/victory/retry loop на 3-5 забегах подряд.
- [ ] Добавить README с запуском проекта и описанием игры.
- [ ] Добавить простую release checklist.
- [ ] Проставить тег `v0.1.0-mvp`, когда MVP будет готов.

Definition of Done:
- Игра стабильно запускается в браузере.
- Полный забег занимает не больше 10-11 минут.
- После первого проигрыша хочется нажать Retry.

## Ближайший фокус

Следующий рабочий срез: Balance And Retry Loop.

Порядок задач:
1. Настроить 10-минутную budget curve.
2. Проверить death/victory/retry loop на нескольких забегах.
3. Проверить баланс финального Bone Knight Captain.
4. Добавить pickup merging при переполнении лимита.
5. Проверить повторный запуск нескольких забегов подряд.

## После MVP

Не брать в работу до завершения MVP:
- новые карты;
- новые персонажи;
- weapon evolutions;
- achievements;
- mobile controls;
- gamepad support;
- leaderboard;
- backend;
- аккаунты;
- монетизация.
