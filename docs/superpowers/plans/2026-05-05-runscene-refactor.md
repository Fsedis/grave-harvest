# RunScene Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Break `src/game/RunScene.ts` into focused game modules while preserving gameplay, balance, save behavior, controls, UI copy, and visual rhythm.

**Architecture:** `RunScene` remains the Phaser scene and state coordinator. Pure formatting moves first, then overlay primitives, HUD ownership, overlay screens, combat helpers, and entity/FX helpers. Each extraction keeps existing behavior intact and is verified before the next extraction.

**Tech Stack:** TypeScript, Vite, Phaser 3, Vitest.

---

## File Structure

- `src/game/RunScene.ts`: stays as scene coordinator; loses pure formatters, UI primitives, HUD layout, overlay screens, combat helpers, and entity/FX helpers over time.
- `src/game/formatters/time.ts`: owns `formatTimer`.
- `src/game/formatters/upgrades.ts`: owns upgrade-card color/label formatting.
- `src/game/formatters/weapons.ts`: owns weapon icon texture names, display names, and HUD line formatting.
- `src/game/formatters/synergies.ts`: owns synergy HUD line formatting.
- `src/game/formatters/meta.ts`: owns meta-upgrade level text formatting.
- `src/game/formatters/colors.ts`: owns numeric Phaser color to CSS string conversion.
- `src/game/formatters/volume.ts`: owns settings volume rounding.
- `src/game/formatters/enemies.ts`: owns enemy texture names, display sizes, and death-burst colors.
- `src/game/formatters/*.test.ts`: Vitest coverage for extracted pure formatters.
- `src/game/overlays/overlayPrimitives.ts`: creates overlay text, rectangles, and buttons using the scene and the shared overlay object list.
- `src/game/hud/HudController.ts`: owns HUD object creation, visibility, low-HP warning layout, regular HUD layout, and balance debug overlay rendering.
- `src/game/overlays/*Overlay.ts`: one file per overlay family: menu, pause, level-up, run-result, meta-upgrades, settings, reset-progress confirm.
- `src/game/combat/*`: weapon firing, projectile updates, timed damage, and synergy combat behavior.
- `src/game/entities/*`: enemy spawning/runtime helpers, pickup handling, and entity cleanup helpers.
- `src/game/fx/*`: bursts, rings, damage numbers, world text, and camera shake.

## Task 1: Extract Pure Formatters

**Files:**
- Create: `src/game/formatters/time.ts`
- Create: `src/game/formatters/colors.ts`
- Create: `src/game/formatters/upgrades.ts`
- Create: `src/game/formatters/weapons.ts`
- Create: `src/game/formatters/synergies.ts`
- Create: `src/game/formatters/meta.ts`
- Create: `src/game/formatters/volume.ts`
- Create: `src/game/formatters/enemies.ts`
- Create: `src/game/formatters/time.test.ts`
- Create: `src/game/formatters/upgrades.test.ts`
- Create: `src/game/formatters/weapons.test.ts`
- Create: `src/game/formatters/synergies.test.ts`
- Create: `src/game/formatters/meta.test.ts`
- Create: `src/game/formatters/enemies.test.ts`
- Modify: `src/game/RunScene.ts`

- [ ] **Step 1: Write formatter tests**

Add tests that lock current output:

```ts
expect(formatTimer(0)).toBe("00:00");
expect(formatTimer(65.8)).toBe("01:05");
expect(formatUpgradeCardLabel({ category: "synergy", rarity: "rare" })).toBe("СИНЕРГИЯ");
expect(formatWeaponName("bone_knives")).toBe("Костяные ножи");
expect(formatSynergyHudLines(["Пламенные ножи", "Воронья панихида"])).toEqual([
  "Пламенные ножи",
  "Воронья панихида"
]);
expect(formatMetaLevelText("meta_damage", 2)).toBe("Сейчас: +10% урона");
expect(getEnemyTexture("bone_knight")).toBe("enemy_bone_knight");
```

- [ ] **Step 2: Run formatter tests before implementation**

Run: `npm test -- src/game/formatters`

Expected: fail because formatter modules do not exist.

- [ ] **Step 3: Move pure helper bodies**

Move the existing helper bodies from the bottom of `RunScene.ts` into the formatter files. Export the functions with the same names where possible:

```ts
export function formatTimer(timeElapsed: number): string;
export function getUpgradeCardColor(upgrade: Pick<UpgradeDefinition, "rarity" | "category">): number;
export function formatUpgradeCardLabel(upgrade: Pick<UpgradeDefinition, "rarity" | "category">): string;
export function formatWeaponHudLine(weaponId: string, stats: DerivedWeaponStats): string;
```

- [ ] **Step 4: Update `RunScene` imports and remove local helper copies**

Import the new formatter functions in `RunScene.ts` and delete the duplicated local helper definitions.

- [ ] **Step 5: Verify Task 1**

Run:

```bash
npm test -- src/game/formatters
npm test
npm run typecheck
npm run build
```

Expected: all commands pass.

- [ ] **Step 6: Commit Task 1**

```bash
git add src/game/RunScene.ts src/game/formatters
git commit -m "вынести форматтеры RunScene"
```

## Task 2: Extract Overlay Primitives

**Files:**
- Create: `src/game/overlays/overlayPrimitives.ts`
- Modify: `src/game/RunScene.ts`

- [ ] **Step 1: Create overlay primitive helpers**

Create functions with explicit dependencies:

```ts
export type OverlayObjectList = Phaser.GameObjects.GameObject[];

export function addOverlayRectangle(
  scene: Phaser.Scene,
  overlayObjects: OverlayObjectList,
  x: number,
  y: number,
  width: number,
  height: number,
  color: number,
  alpha: number
): Phaser.GameObjects.Rectangle;
```

Repeat the same pattern for `addOverlayText` and `addOverlayButton`.

- [ ] **Step 2: Replace `RunScene` primitive methods**

Update `RunScene` methods so calls use imported helpers with `this` and `this.overlayObjects`. Keep every existing call site argument unchanged.

- [ ] **Step 3: Verify Task 2**

Run:

```bash
npm test
npm run typecheck
npm run build
```

Expected: all commands pass.

- [ ] **Step 4: Commit Task 2**

```bash
git add src/game/RunScene.ts src/game/overlays/overlayPrimitives.ts
git commit -m "вынести overlay primitives"
```

## Task 3: Extract HUD Controller

**Files:**
- Create: `src/game/hud/HudController.ts`
- Modify: `src/game/RunScene.ts`

- [ ] **Step 1: Create HUD state types**

Define a `HudSnapshot` that contains only values needed for drawing:

```ts
export type HudSnapshot = {
  status: "menu" | "playing" | "level_up" | "paused" | "game_over" | "victory" | "meta_upgrades" | "settings" | "reset_confirm";
  hp: number;
  maxHp: number;
  xp: number;
  xpRequired: number;
  timeElapsed: number;
  bones: number;
  kills: number;
  level: number;
  weapons: string[];
  activeSynergyNames: string[];
  finalBoss: { hp: number; maxHp: number } | null;
  balanceDebug: {
    enabled: boolean;
    fps: number;
    playerSpeed: number;
    hitCooldown: number;
    activeEnemies: number;
    activeProjectiles: number;
    activePickups: number;
    spawnBudget: number;
  };
};
```

- [ ] **Step 2: Move HUD object creation and layout**

Move `createHud`, `layoutHud`, `setHudVisible`, `layoutLowHpWarning`, `setLowHpWarningVisible`, and `updateBalanceDebugOverlay` behavior into `HudController`.

- [ ] **Step 3: Keep `RunScene` as snapshot provider**

Add a private `getHudSnapshot()` method in `RunScene` and call `this.hud.update(this.getHudSnapshot())` from the existing update/layout path.

- [ ] **Step 4: Verify Task 3**

Run:

```bash
npm test
npm run typecheck
npm run build
```

Expected: all commands pass.

- [ ] **Step 5: Commit Task 3**

```bash
git add src/game/RunScene.ts src/game/hud/HudController.ts
git commit -m "вынести HUD controller"
```

## Task 4: Extract Overlay Screens

**Files:**
- Create: `src/game/overlays/menuOverlay.ts`
- Create: `src/game/overlays/pauseOverlay.ts`
- Create: `src/game/overlays/levelUpOverlay.ts`
- Create: `src/game/overlays/runResultOverlay.ts`
- Create: `src/game/overlays/metaUpgradesOverlay.ts`
- Create: `src/game/overlays/settingsOverlay.ts`
- Create: `src/game/overlays/resetProgressOverlay.ts`
- Modify: `src/game/RunScene.ts`

- [ ] **Step 1: Extract one overlay at a time**

Move overlays in this order: menu, pause, level-up, run results, meta-upgrades, settings, reset confirm. Each exported function receives data and callbacks explicitly:

```ts
export function showLevelUpOverlay(params: {
  scene: Phaser.Scene;
  overlayObjects: Phaser.GameObjects.GameObject[];
  width: number;
  height: number;
  currentUpgradeOptions: UpgradeDefinition[];
  getUpgradeStacks: (upgradeId: string) => number;
  pickUpgradeByIndex: (index: number) => void;
}): void;
```

- [ ] **Step 2: Keep state transitions in `RunScene`**

Overlay modules may call callbacks, but status changes remain in `RunScene` methods such as `showMainMenu`, `showPauseOverlay`, and `showSettingsOverlay`.

- [ ] **Step 3: Verify after each overlay family**

Run after each moved overlay:

```bash
npm run typecheck
npm run build
```

Expected: both commands pass.

- [ ] **Step 4: Full verification for Task 4**

Run:

```bash
npm test
npm run typecheck
npm run build
```

Expected: all commands pass.

- [ ] **Step 5: Commit Task 4**

```bash
git add src/game/RunScene.ts src/game/overlays
git commit -m "вынести overlay экраны"
```

## Task 5: Extract Combat Systems

**Files:**
- Create: `src/game/combat/synergyFlags.ts`
- Create: `src/game/combat/timedDamage.ts`
- Create: `src/game/combat/weaponAttacks.ts`
- Create: `src/game/combat/projectiles.ts`
- Modify: `src/game/RunScene.ts`

- [ ] **Step 1: Extract pure synergy flag builder**

Move `getActiveSynergyFlags` logic into a pure helper:

```ts
export function getActiveSynergyFlags(upgrades: UpgradeState): ActiveSynergyFlags;
```

- [ ] **Step 2: Extract timed damage helpers**

Move timed damage bookkeeping into helpers that still receive callbacks for applying damage and visual feedback.

- [ ] **Step 3: Extract weapon attack functions**

Move one weapon family at a time: Bone Knives, Holy Candle, Grave Bell, Crow Swarm. Keep existing numeric constants and imported domain formulas unchanged.

- [ ] **Step 4: Extract projectile update helpers**

Move projectile movement, homing update, pierce handling, and crow flame burst trigger. Keep collision and group ownership in `RunScene` until the helper boundaries are stable.

- [ ] **Step 5: Verify Task 5**

Run:

```bash
npm test
npm run typecheck
npm run build
```

Expected: all commands pass.

- [ ] **Step 6: Commit Task 5**

```bash
git add src/game/RunScene.ts src/game/combat
git commit -m "вынести боевые системы"
```

## Task 6: Extract Entity And FX Helpers

**Files:**
- Create: `src/game/entities/enemies.ts`
- Create: `src/game/entities/pickups.ts`
- Create: `src/game/fx/combatFx.ts`
- Modify: `src/game/RunScene.ts`

- [ ] **Step 1: Extract enemy runtime helpers**

Move enemy texture/display formatting already covered by formatters, then move spawn placement and scripted-spawn helper behavior where dependencies are explicit.

- [ ] **Step 2: Extract pickup helpers**

Move pickup merge and collection helpers that can operate with explicit callbacks.

- [ ] **Step 3: Extract FX helpers**

Move burst, ring, world text, damage number, and camera shake helpers. Keep settings and timing inputs explicit.

- [ ] **Step 4: Verify Task 6**

Run:

```bash
npm test
npm run typecheck
npm run build
```

Expected: all commands pass.

- [ ] **Step 5: Commit Task 6**

```bash
git add src/game/RunScene.ts src/game/entities src/game/fx
git commit -m "вынести entities и fx helpers"
```

## Task 7: Final Manual Smoke And Release Safety Check

**Files:**
- Modify only if final verification exposes a regression.

- [ ] **Step 1: Run full automated verification**

Run:

```bash
npm test
npm run typecheck
npm run build
```

Expected: 104+ tests pass, TypeScript reports no errors, Vite build completes.

- [ ] **Step 2: Start local dev server**

Run: `npm run dev -- --host 127.0.0.1`

Expected: Vite prints a local URL, usually `http://127.0.0.1:5173/`.

- [ ] **Step 3: Manual smoke checklist**

Check in browser:

- main menu starts a run;
- movement works with WASD/arrows;
- level-up cards show and can be selected;
- pause, resume, settings, and reset-confirm overlays open and close;
- game over and victory overlays show results and active synergies;
- meta upgrades can be opened;
- `?debug=balance` shows debug overlay;
- all four weapons visibly attack;
- burn, bleed, pierce, flame burst, bonus crow, and bell/candle synergy effects still appear;
- Captain appears after 10:00 and victory still requires killing Captain.

- [ ] **Step 4: Commit final fixes if needed**

If smoke reveals a regression, fix only that regression and commit:

```bash
git add src
git commit -m "исправить регрессию после рефактора"
```

- [ ] **Step 5: Report completion**

Report changed module groups, verification results, remaining manual smoke gaps, and branch path.
