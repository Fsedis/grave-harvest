# Grave Harvest Grey Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first playable browser slice of Grave Harvest: movement, enemies, contact damage, automatic Bone Knives, XP pickup, level-up choices, and game-over retry.

**Architecture:** Phaser owns rendering/input/scene lifecycle. Pure TypeScript modules in `src/domain` own deterministic formulas and data filtering so the prototype has real tests from day one. MVP content definitions live in `src/data`.

**Tech Stack:** TypeScript, Vite, Phaser 3, Vitest.

---

## File Structure

- `package.json`: scripts and dependencies.
- `tsconfig.json`: TypeScript compiler settings.
- `vite.config.ts`: Vite and Vitest config.
- `index.html`: app root.
- `src/main.ts`: Phaser boot.
- `src/styles.css`: page/canvas styling.
- `src/domain/progression.ts`: XP and bone retention formulas.
- `src/domain/upgrades.ts`: upgrade definitions, selection, application.
- `src/domain/spawnDirector.ts`: spawn budget and enemy availability.
- `src/data/enemies.ts`: enemy definitions.
- `src/data/weapons.ts`: weapon definitions.
- `src/game/RunScene.ts`: playable prototype scene.
- `src/domain/*.test.ts`: Vitest coverage for pure logic.

### Task 1: Project Shell

- [ ] Create Vite/TypeScript package files.
- [ ] Install `phaser`, `vite`, `typescript`, `vitest`.
- [ ] Add `dev`, `build`, `typecheck`, and `test` scripts.
- [ ] Verify `npm run typecheck` reaches the codebase.

### Task 2: RED Tests For Core Formulas

- [ ] Add tests for `xpRequired`, `calculateRetainedBones`, and `getSpawnBudgetPerSecond`.
- [ ] Run the tests and confirm they fail because modules do not exist yet.

### Task 3: GREEN Core Formulas

- [ ] Implement `src/domain/progression.ts`.
- [ ] Implement `src/domain/spawnDirector.ts`.
- [ ] Add `src/data/enemies.ts`.
- [ ] Run tests and confirm formula tests pass.

### Task 4: RED Tests For Upgrades

- [ ] Add tests for upgrade selection and application.
- [ ] Run the tests and confirm they fail because upgrade logic is missing.

### Task 5: GREEN Upgrades

- [ ] Implement `src/domain/upgrades.ts`.
- [ ] Run tests and confirm all domain tests pass.

### Task 6: Phaser Prototype

- [ ] Add generated textures and `RunScene`.
- [ ] Implement main menu overlay.
- [ ] Implement player movement and camera bounds.
- [ ] Implement Skeleton spawn/chase/contact damage.
- [ ] Implement Bone Knives projectile targeting.
- [ ] Implement XP drops, magnet pickup, level-up cards, and upgrade application.
- [ ] Implement game-over stats and retry.

### Task 7: Verification And Launch

- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Start `npm run dev -- --host 127.0.0.1`.
- [ ] Report the local URL and verification results.
