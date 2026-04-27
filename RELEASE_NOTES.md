# Release Notes

## v0.1.0

Первая завершенная MVP-версия Grave Harvest.

### Главное

- Полный забег до 10:00.
- Финальный Bone Knight Captain появляется после 10:00.
- Победа засчитывается только после убийства Captain.
- Смерть и победа завершают забег через отдельные экраны результатов.
- Retry и следующий забег корректно сбрасывают боевое состояние.

### Gameplay

- 4 MVP-оружия: Bone Knives, Holy Candle, Grave Bell, Crow Swarm.
- 5 MVP-врагов: Skeleton, Grave Rat, Rot Walker, Ghost, Bone Knight.
- Run-upgrades, weapon-specific upgrades, rare-эффекты.
- XP pickups, level-up cards и weapon unlock cards.
- Bones drops, retention и permanent upgrades.

### UX и feel

- Русский UI.
- Pause screen со статами и справкой.
- First-run hints.
- Settings для screen shake, damage numbers и громкости.
- Damage numbers, low HP warning, hit/death/pickup feedback.
- WebAudio SFX и простой run-only ambient loop.
- Movement + crowd feel polish: acceleration/deceleration, contact knockback, улучшенная separation-логика.

### Техническое

- Vite + TypeScript + Phaser.
- Domain helpers покрыты Vitest-тестами.
- Сохранение прогресса через localStorage.
- Debug overlay через `?debug=balance`.
- Backend не нужен.

### Проверка релиза

- `npm test`
- `npm run typecheck`
- `npm run build`
- Browser smoke на `http://127.0.0.1:5173/`
