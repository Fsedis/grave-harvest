import Phaser from "phaser";
import { getEnemyDefinition, type EnemyDefinition } from "../data/enemies";
import { getBalanceDebugEnabled } from "../domain/balance";
import {
  getDamageNumberVisual,
  shouldApplyScreenShake,
  shouldShowDamageNumber
} from "../domain/effects";
import {
  getContactKnockback,
  getInputDirection,
  stepVelocityTowardTarget
} from "../domain/movement";
import type { PickupType } from "../domain/pickups";
import { xpRequired } from "../domain/progression";
import {
  ENEMY_SPAWN_CAPS,
  getScriptedEnemySpawns,
  getSpawnBudgetPerSecond,
  getSpawnPressureMultiplier,
  pickEnemyForBudget,
  type ScriptedEnemySpawn
} from "../domain/spawnDirector";
import { hasWonNight } from "../domain/runRules";
import {
  applyMetaToUpgradeState,
  getMetaRetentionBonus,
  purchaseMetaUpgrade,
  type MetaUpgradeId
} from "../domain/metaProgression";
import {
  applyRunEndSummaryToSave,
  createRunEndSummary,
  type RunEndSummary
} from "../domain/runSummary";
import {
  createDefaultSaveData,
  loadSave,
  markFirstRunHintsSeen,
  persistSave,
  resetSave,
  updateSettings,
  type SaveData,
  type SettingsData,
  type StorageLike
} from "../domain/save";
import {
  type BellPulseSpec
} from "../domain/weaponEffects";
import {
  applyUpgrade,
  createInitialUpgradeState,
  getDerivedWeaponStats,
  selectUpgradeOptions,
  type UpgradeDefinition,
  type UpgradeState
} from "../domain/upgrades";
import { AudioManager } from "./audio/AudioManager";
import { getActiveSynergyFlags } from "./combat/synergyFlags";
import {
  applyTimedDamageToTarget,
  consumeTimedDamageForTarget,
  getTimedDamageColor,
  type TimedDamageType
} from "./combat/timedDamage";
import { updateProjectiles, type ProjectileUpdateContext } from "./combat/projectiles";
import {
  applyBellPulse,
  fireBoneKnives,
  releaseCrowSwarm,
  ringGraveBell,
  tickHolyCandle,
  type WeaponAttackContext
} from "./combat/weaponAttacks";
import { colorToCss } from "./formatters/colors";
import { getDeathBurstColor } from "./formatters/enemies";
import {
  calculateEnemySeparation,
  spawnEnemyInstance as createEnemyInstance,
  updateEnemyVisual
} from "./entities/enemies";
import { clearPhysicsGroups } from "./entities/physicsGroups";
import {
  getPickupFxColor,
  mergePickupValue as mergePickupEntityValue,
  spawnPickupEntity,
  updatePickupMovement
} from "./entities/pickups";
import type {
  DamageFeedbackOptions,
  EnemySprite,
  PickupSprite
} from "./entities/types";
import {
  createBurstFx,
  createDamageRadiusRingFx,
  createRingBurstFx,
  showWorldTextFx
} from "./fx/combatFx";
import { HudController, type HudLayoutSnapshot } from "./hud/HudController";
import { renderLevelUpOverlay } from "./overlays/levelUpOverlay";
import { renderMainMenuOverlay } from "./overlays/menuOverlay";
import { renderMetaUpgradesOverlay } from "./overlays/metaUpgradesOverlay";
import { clearOverlayObjects } from "./overlays/overlayPrimitives";
import { renderPauseOverlay } from "./overlays/pauseOverlay";
import { renderResetProgressConfirmOverlay } from "./overlays/resetProgressOverlay";
import { renderGameOverOverlay, renderVictoryOverlay } from "./overlays/runResultOverlay";
import { renderSettingsOverlay } from "./overlays/settingsOverlay";
import { createGraveyardArena } from "./world/arena";
import { createGameTextures } from "./world/textures";

const MAP_SIZE = 2200;
const PLAYER_RADIUS = 16;
const HARD_ENEMY_CAP = ENEMY_SPAWN_CAPS.hard;
const HARD_PROJECTILE_CAP = 300;
const HARD_PICKUP_CAP = 400;
const PLAYER_INVULNERABILITY_SECONDS = 0.45;
const PLAYER_ACCELERATION = 1550;
const PLAYER_DECELERATION = 2200;
const PLAYER_CONTACT_KNOCKBACK_SPEED = 260;
const PLAYER_CONTACT_KNOCKBACK_SECONDS = 0.16;
const ENEMY_SEPARATION_STRENGTH = 1.02;
const FIRST_RUN_HINTS = [
  "Двигайся WASD или стрелками. Остановиться на кладбище — плохая идея.",
  "Атаки автоматические. Держи дистанцию и веди толпу за собой.",
  "Собирай голубые души: они дают уровни и новые проклятия."
];

type RunStatus =
  | "menu"
  | "playing"
  | "paused"
  | "level_up"
  | "game_over"
  | "victory"
  | "meta_upgrades"
  | "settings"
  | "reset_confirm";

type SettingsReturnTarget = "menu" | "pause";

type PendingBellPulse = {
  fireAt: number;
  pulse: BellPulseSpec;
};

type RunStats = {
  hp: number;
  level: number;
  xp: number;
  xpToNext: number;
  timeElapsed: number;
  kills: number;
  bonesCollected: number;
  spawnBudget: number;
  weaponCooldowns: Record<string, number>;
  invulnerableUntil: number;
  finalBossKilled: boolean;
  upgrades: UpgradeState;
};

export class RunScene extends Phaser.Scene {
  private status: RunStatus = "menu";
  private player!: Phaser.Physics.Arcade.Image;
  private enemies!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private pickups!: Phaser.Physics.Arcade.Group;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<"w" | "a" | "s" | "d", Phaser.Input.Keyboard.Key>;
  private run!: RunStats;
  private currentUpgradeOptions: UpgradeDefinition[] = [];
  private overlayObjects: Phaser.GameObjects.GameObject[] = [];
  private hud!: HudController;
  private damageNumberTexts: Phaser.GameObjects.Text[] = [];
  private hintObjects: Phaser.GameObjects.GameObject[] = [];
  private hintTimers: Phaser.Time.TimerEvent[] = [];
  private nextEnemyRuntimeId = 1;
  private pendingBellPulses: PendingBellPulse[] = [];
  private activeFinalBoss: EnemySprite | null = null;
  private saveData: SaveData = createDefaultSaveData();
  private runEndSummary: RunEndSummary | null = null;
  private settingsReturnTarget: SettingsReturnTarget = "menu";
  private audio!: AudioManager;
  private balanceDebugEnabled = false;
  private balanceDebugFps = 60;
  private playerKnockbackUntil = 0;
  private playerKnockbackVelocity = { x: 0, y: 0 };

  constructor() {
    super("RunScene");
  }

  private getStorage(): StorageLike | null {
    if (typeof globalThis.localStorage === "undefined") {
      return null;
    }

    return globalThis.localStorage;
  }

  private loadSaveData(): void {
    const storage = this.getStorage();
    this.saveData = storage ? loadSave(storage) : createDefaultSaveData();
  }

  private persistSaveData(): void {
    const storage = this.getStorage();

    if (!storage) {
      return;
    }

    persistSave(storage, this.saveData);
  }

  private resetSaveData(): void {
    const storage = this.getStorage();

    if (storage) {
      resetSave(storage);
    }

    this.saveData = createDefaultSaveData();
    this.audio.updateSettings(this.saveData.settings);
  }

  create(): void {
    this.loadSaveData();
    this.audio = new AudioManager(this.saveData.settings);
    this.balanceDebugEnabled = getBalanceDebugEnabled(getCurrentLocationSearch());
    createGameTextures(this);
    createGraveyardArena(this, MAP_SIZE);
    this.createGroups();
    this.createInput();
    this.createHud();
    this.showMainMenu();
    this.scale.on("resize", this.layoutHud, this);
  }

  update(_time: number, deltaMs: number): void {
    if (this.status !== "playing") {
      return;
    }

    const dt = Math.min(deltaMs / 1000, 0.033);

    this.balanceDebugFps = this.balanceDebugFps * 0.9 + (1000 / Math.max(deltaMs, 1)) * 0.1;
    this.run.timeElapsed += dt;
    this.updatePlayerMovement(dt);
    this.updateSpawnDirector(dt);
    if (this.status !== "playing") {
      return;
    }
    this.updateEnemies(dt);
    if (this.status !== "playing") {
      return;
    }
    this.updateEnemyStatusEffects();
    if (this.status !== "playing") {
      return;
    }
    this.updateWeapons(dt);
    if (this.status !== "playing") {
      return;
    }
    this.updatePendingBellPulses();
    if (this.status !== "playing") {
      return;
    }
    updateProjectiles(this.getProjectileUpdateContext(), dt);
    if (this.status !== "playing") {
      return;
    }
    this.updatePickups(dt);
    if (this.status !== "playing") {
      return;
    }
    this.layoutHud();
  }

  private createGroups(): void {
    this.enemies = this.physics.add.group({ maxSize: HARD_ENEMY_CAP });
    this.projectiles = this.physics.add.group({ maxSize: HARD_PROJECTILE_CAP });
    this.pickups = this.physics.add.group({ maxSize: HARD_PICKUP_CAP });

    this.player = this.physics.add.image(MAP_SIZE / 2, MAP_SIZE / 2, "player");
    this.player.setDepth(20);
    this.player.setCollideWorldBounds(true);
    this.player.setSize(28, 28);
    this.cameras.main.startFollow(this.player, true, 0.14, 0.14);
  }

  private createInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      w: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };

    this.input.keyboard!.on("keydown-ONE", () => this.pickUpgradeByIndex(0));
    this.input.keyboard!.on("keydown-TWO", () => this.pickUpgradeByIndex(1));
    this.input.keyboard!.on("keydown-THREE", () => this.pickUpgradeByIndex(2));
    this.input.keyboard!.on("keydown-ENTER", () => {
      if (this.status === "menu" || this.status === "game_over" || this.status === "victory") {
        this.startRun();
      }
    });
    this.input.keyboard!.on("keydown-ESC", () => {
      if (this.status === "playing") {
        this.pauseRun();
      } else if (this.status === "paused") {
        this.resumeRun();
      } else if (this.status === "settings") {
        this.closeSettingsOverlay();
      } else if (this.status === "meta_upgrades" || this.status === "reset_confirm") {
        this.showMainMenu();
      }
    });
  }

  private createHud(): void {
    this.hud = new HudController(this, this.balanceDebugEnabled);
    this.hud.create();
    this.layoutHud();
    this.setHudVisible(false);
  }

  private startRun(): void {
    this.audio.stopRunMusic();
    this.audio.updateSettings(this.saveData.settings);
    this.clearOverlay();
    this.clearEntities();
    this.currentUpgradeOptions = [];
    this.runEndSummary = null;
    this.nextEnemyRuntimeId = 1;
    const upgradeState = createInitialUpgradeState();
    applyMetaToUpgradeState(upgradeState, this.saveData.meta);

    this.run = {
      hp: upgradeState.maxHp,
      level: 1,
      xp: 0,
      xpToNext: xpRequired(1),
      timeElapsed: 0,
      kills: 0,
      bonesCollected: 0,
      spawnBudget: 0,
      weaponCooldowns: {
        bone_knives: 0.35
      },
      invulnerableUntil: 0,
      finalBossKilled: false,
      upgrades: upgradeState
    };

    this.activeFinalBoss = null;
    this.playerKnockbackUntil = 0;
    this.playerKnockbackVelocity = { x: 0, y: 0 };
    this.setLowHpWarningVisible(false);
    this.player.enableBody(true, MAP_SIZE / 2, MAP_SIZE / 2, true, true);
    this.player.clearTint();
    this.player.setVelocity(0, 0);
    this.cameras.main.startFollow(this.player, true, 0.14, 0.14);
    this.physics.resume();
    this.status = "playing";
    this.setHudVisible(true);
    this.layoutHud();
    this.startRunAudio();
    this.showFirstRunHintsIfNeeded();
  }

  private pauseRun(): void {
    this.status = "paused";
    this.physics.pause();
    this.audio.stopRunMusic();
    this.setLowHpWarningVisible(false);
    this.showPauseOverlay();
  }

  private resumeRun(): void {
    this.clearOverlay();
    this.status = "playing";
    this.physics.resume();
    this.startRunAudio();
  }

  private startRunAudio(): void {
    void this.audio
      .unlock()
      .catch(() => undefined)
      .then(() => {
        if (this.status === "playing") {
          this.audio.startRunMusic();
        }
      });
  }

  private showFirstRunHintsIfNeeded(): void {
    if (this.saveData.tutorial.firstRunHintsSeen) {
      return;
    }

    this.saveData = markFirstRunHintsSeen(this.saveData);
    this.persistSaveData();

    FIRST_RUN_HINTS.forEach((message, index) => {
      const timer = this.time.delayedCall(850 + index * 4100, () => {
        if (this.status === "playing") {
          this.showGameplayHint(message);
        }
      });
      this.hintTimers.push(timer);
    });
  }

  private showGameplayHint(message: string): void {
    this.clearHintObjects();

    const { width, height } = this.scale;
    const compact = width < 760;
    const boxWidth = Math.min(width - 48, compact ? 430 : 560);
    const boxHeight = compact ? 58 : 54;
    const x = width / 2;
    const y = height - (compact ? 104 : 96);
    const back = this.add
      .rectangle(x, y, boxWidth, boxHeight, 0x111612, 0.94)
      .setStrokeStyle(1, 0xc9b46a, 0.8)
      .setScrollFactor(0)
      .setDepth(1500);
    const text = this.add
      .text(x, y, message, {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: compact ? "15px" : "17px",
        fontStyle: "700",
        color: "#f4ead7",
        align: "center",
        wordWrap: { width: boxWidth - 36 }
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1501);

    this.hintObjects.push(back, text);
    this.tweens.add({
      targets: this.hintObjects,
      alpha: { from: 0, to: 1 },
      y: y - 8,
      duration: 180,
      ease: "Quad.easeOut"
    });

    const hideTimer = this.time.delayedCall(3200, () => this.fadeOutHints());
    this.hintTimers.push(hideTimer);
  }

  private fadeOutHints(): void {
    if (this.hintObjects.length === 0) {
      return;
    }

    this.tweens.add({
      targets: this.hintObjects,
      alpha: 0,
      duration: 220,
      ease: "Quad.easeOut",
      onComplete: () => this.clearHintObjects()
    });
  }

  private updatePlayerMovement(dt: number): void {
    const direction = getInputDirection({
      left: Boolean(this.cursors.left?.isDown || this.wasd.a.isDown),
      right: Boolean(this.cursors.right?.isDown || this.wasd.d.isDown),
      up: Boolean(this.cursors.up?.isDown || this.wasd.w.isDown),
      down: Boolean(this.cursors.down?.isDown || this.wasd.s.isDown)
    });
    const targetVelocity = {
      x: direction.x * this.run.upgrades.moveSpeed,
      y: direction.y * this.run.upgrades.moveSpeed
    };
    const body = this.player.body as Phaser.Physics.Arcade.Body | null;
    const knockbackActive = this.run.timeElapsed < this.playerKnockbackUntil;
    const activeKnockback = knockbackActive ? this.playerKnockbackVelocity : { x: 0, y: 0 };
    const currentVelocity = body
      ? {
          x: body.velocity.x - activeKnockback.x,
          y: body.velocity.y - activeKnockback.y
        }
      : {
          x: 0,
          y: 0
        };
    const nextVelocity = stepVelocityTowardTarget({
      current: currentVelocity,
      target: targetVelocity,
      acceleration: PLAYER_ACCELERATION,
      deceleration: PLAYER_DECELERATION,
      dt
    });

    if (knockbackActive) {
      nextVelocity.x += activeKnockback.x;
      nextVelocity.y += activeKnockback.y;
    } else {
      this.playerKnockbackVelocity = { x: 0, y: 0 };
    }

    this.player.setVelocity(nextVelocity.x, nextVelocity.y);
  }

  private updateSpawnDirector(dt: number): void {
    const previousTime = Math.max(0, this.run.timeElapsed - dt);
    const scriptedSpawns = getScriptedEnemySpawns(previousTime, this.run.timeElapsed);

    scriptedSpawns.forEach((spawn) => this.spawnScriptedEnemy(spawn));

    const activeEnemies = this.enemies.countActive(true);
    const pressureMultiplier = getSpawnPressureMultiplier(activeEnemies);

    if (pressureMultiplier <= 0) {
      return;
    }

    this.run.spawnBudget += getSpawnBudgetPerSecond(this.run.timeElapsed) * pressureMultiplier * dt;

    let spawnedThisFrame = 0;
    while (this.run.spawnBudget >= 1 && spawnedThisFrame < 8 && this.enemies.countActive(true) < HARD_ENEMY_CAP) {
      const enemy = pickEnemyForBudget(this.run.spawnBudget, this.run.timeElapsed);

      if (!enemy) {
        break;
      }

      this.spawnEnemy(enemy);
      this.run.spawnBudget -= enemy.spawnCost;
      spawnedThisFrame += 1;
    }
  }

  private spawnEnemy(definition: EnemyDefinition): void {
    this.spawnEnemyInstance(definition);
  }

  private spawnScriptedEnemy(spawn: ScriptedEnemySpawn): void {
    const definition = getEnemyDefinition(spawn.enemyId);
    const enemy = this.spawnEnemyInstance(definition, spawn);

    if (enemy) {
      if (spawn.id === "bone_knight_captain") {
        this.activeFinalBoss = enemy;
      }

      this.createRingBurst(enemy.x, enemy.y, spawn.color, definition.radius * 2.2 * spawn.scaleMultiplier);
      this.showWorldText(enemy.x, enemy.y - definition.radius * 2.8, spawn.name, "#f1dfaa", 24);
      this.shakeCamera(spawn.id === "bone_knight_captain" ? 260 : 160, 0.005);
      this.audio.playSfx("boss_spawn");
    }
  }

  private spawnEnemyInstance(definition: EnemyDefinition, scripted?: ScriptedEnemySpawn): EnemySprite | null {
    const enemy = createEnemyInstance({
      enemies: this.enemies,
      player: this.player,
      definition,
      runtimeId: this.nextEnemyRuntimeId,
      timeElapsed: this.run.timeElapsed,
      mapSize: MAP_SIZE,
      hardEnemyCap: HARD_ENEMY_CAP,
      scripted
    });

    if (enemy) {
      this.nextEnemyRuntimeId += 1;
    }

    return enemy;
  }

  private updateEnemies(dt: number): void {
    for (const child of this.enemies.getChildren()) {
      const enemy = child as EnemySprite;

      if (!enemy.active) {
        continue;
      }

      const toPlayer = new Phaser.Math.Vector2(this.player.x - enemy.x, this.player.y - enemy.y);
      const distance = Math.max(1, toPlayer.length());
      const direction = toPlayer.normalize();
      let speed = enemy.def.speed;
      let separationStrength = ENEMY_SEPARATION_STRENGTH;

      if (enemy.def.behavior === "zigzag") {
        const wobble = Math.sin((this.run.timeElapsed - enemy.spawnedAt) * 5) * 0.75;
        direction.rotate(wobble);
      }

      if (enemy.def.behavior === "dash") {
        if (this.run.timeElapsed >= enemy.nextDashAt) {
          enemy.dashUntil = this.run.timeElapsed + 0.42;
          enemy.nextDashAt = this.run.timeElapsed + 5;
          this.createRingBurst(enemy.x, enemy.y, enemy.isElite ? 0xd1c07d : 0xc8c0b0, enemy.def.radius + 18);
        }

        if (this.run.timeElapsed < enemy.dashUntil) {
          speed *= 2.6;
          separationStrength *= 0.35;
        }
      }

      const separation = calculateEnemySeparation(this.enemies, enemy);
      const movement = direction.add(separation.scale(separationStrength));

      if (movement.lengthSq() > 0) {
        movement.normalize();
      }

      enemy.setVelocity(movement.x * speed, movement.y * speed);
      updateEnemyVisual(enemy, this.run.timeElapsed);

      if (distance < PLAYER_RADIUS + enemy.def.radius && this.run.timeElapsed >= this.run.invulnerableUntil) {
        this.damagePlayer(enemy.def.damage, enemy);
      }

      if (dt > 0 && distance < PLAYER_RADIUS + enemy.def.radius + 10) {
        enemy.x -= direction.x * 18 * dt;
        enemy.y -= direction.y * 18 * dt;
      }
    }
  }

  private damagePlayer(amount: number, source?: { x: number; y: number }): void {
    this.run.hp = Math.max(0, this.run.hp - amount);
    this.run.invulnerableUntil = this.run.timeElapsed + PLAYER_INVULNERABILITY_SECONDS;
    if (source) {
      this.playerKnockbackVelocity = getContactKnockback({
        player: {
          x: this.player.x,
          y: this.player.y
        },
        enemy: source,
        speed: PLAYER_CONTACT_KNOCKBACK_SPEED
      });
      this.playerKnockbackUntil = this.run.timeElapsed + PLAYER_CONTACT_KNOCKBACK_SECONDS;
    }
    this.player.setTintFill(0xff5a54);
    this.shakeCamera(120, 0.006);
    this.audio.playSfx("player_hit");
    this.createBurst(this.player.x, this.player.y, 0xff5a54, 5, 22, 150);
    this.createRingBurst(this.player.x, this.player.y, 0xff5a54, PLAYER_RADIUS + 14);
    this.time.delayedCall(90, () => {
      if (this.status === "playing") {
        this.player.clearTint();
      }
    });

    if (this.run.hp <= 0) {
      this.endRun();
    }
  }

  private updateWeapons(dt: number): void {
    const weaponContext = this.getWeaponAttackContext();

    for (const weaponId of this.run.upgrades.weapons) {
      this.run.weaponCooldowns[weaponId] ??= 0.1;
      this.run.weaponCooldowns[weaponId] -= dt;

      if (this.run.weaponCooldowns[weaponId] > 0) {
        continue;
      }

      const stats = getDerivedWeaponStats(this.run.upgrades, weaponId);
      const synergyFlags = getActiveSynergyFlags(this.run.upgrades);
      this.run.weaponCooldowns[weaponId] = stats.cooldown;

      if (weaponId === "bone_knives") {
        fireBoneKnives(weaponContext, stats, synergyFlags);
      } else if (weaponId === "holy_candle") {
        tickHolyCandle(weaponContext, stats);
      } else if (weaponId === "grave_bell") {
        ringGraveBell(weaponContext, stats, synergyFlags);
      } else if (weaponId === "crow_swarm") {
        releaseCrowSwarm(weaponContext, stats, synergyFlags);
      }
    }
  }

  private updatePendingBellPulses(): void {
    if (this.pendingBellPulses.length === 0) {
      return;
    }

    const stillPending: PendingBellPulse[] = [];
    const synergyFlags = getActiveSynergyFlags(this.run.upgrades);

    for (const pendingPulse of this.pendingBellPulses) {
      if (pendingPulse.fireAt <= this.run.timeElapsed) {
        applyBellPulse(this.getWeaponAttackContext(), pendingPulse.pulse, synergyFlags);
        if (this.status !== "playing") {
          break;
        }
      } else {
        stillPending.push(pendingPulse);
      }
    }

    this.pendingBellPulses = stillPending;
  }

  private updateEnemyStatusEffects(): void {
    for (const child of this.enemies.getChildren()) {
      const enemy = child as EnemySprite;

      if (!enemy.active) {
        continue;
      }

      this.tickEnemyTimedDamage(enemy, "burn", 0xf7944d);
      if (enemy.active) {
        this.tickEnemyTimedDamage(enemy, "bleed", 0xc43a3a);
      }
    }
  }

  private tickEnemyTimedDamage(
    enemy: EnemySprite,
    effectType: TimedDamageType,
    color: number
  ): void {
    const result = consumeTimedDamageForTarget(enemy, effectType, this.run.timeElapsed);
    if (!result) {
      return;
    }

    for (let tick = 0; tick < result.ticks && enemy.active; tick += 1) {
      this.damageEnemy(enemy, result.damagePerTick, {
        important: enemy.isElite,
        color
      });
      if (enemy.active) {
        this.createBurst(enemy.x, enemy.y, color, 2, 10, 120);
      }
    }
  }

  private applyTimedDamageEffect(
    enemy: EnemySprite,
    effectType: TimedDamageType,
    damagePerTick: number
  ): void {
    applyTimedDamageToTarget(enemy, effectType, this.run.timeElapsed, damagePerTick);
    this.createBurst(enemy.x, enemy.y, getTimedDamageColor(effectType), 2, 10, 120);
  }

  private getWeaponAttackContext(): WeaponAttackContext {
    return {
      player: this.player,
      enemies: this.enemies,
      projectiles: this.projectiles,
      upgrades: this.run.upgrades,
      timeElapsed: this.run.timeElapsed,
      hardProjectileCap: HARD_PROJECTILE_CAP,
      playSfx: (event) => this.audio.playSfx(event),
      damageEnemy: (enemy, amount, feedback) => this.damageEnemy(enemy, amount, feedback),
      applyTimedDamageEffect: (enemy, effectType, damagePerTick) =>
        this.applyTimedDamageEffect(enemy, effectType, damagePerTick),
      createBurst: (x, y, color, count, distance, duration) =>
        this.createBurst(x, y, color, count, distance, duration),
      createDamageRadiusRing: (x, y, color, radius) =>
        this.createDamageRadiusRing(x, y, color, radius),
      queueBellPulse: (fireAt, pulse) => this.pendingBellPulses.push({ fireAt, pulse }),
      shakeCamera: (durationMs, intensity) => this.shakeCamera(durationMs, intensity)
    };
  }

  private getProjectileUpdateContext(): ProjectileUpdateContext {
    return {
      enemies: this.enemies,
      projectiles: this.projectiles,
      damageEnemy: (enemy, amount, feedback) => this.damageEnemy(enemy, amount, feedback),
      applyTimedDamageEffect: (enemy, effectType, damagePerTick) =>
        this.applyTimedDamageEffect(enemy, effectType, damagePerTick),
      createBurst: (x, y, color, count, distance, duration) =>
        this.createBurst(x, y, color, count, distance, duration),
      createDamageRadiusRing: (x, y, color, radius) =>
        this.createDamageRadiusRing(x, y, color, radius)
    };
  }

  private damageEnemy(enemy: EnemySprite, amount: number, feedback: DamageFeedbackOptions = {}): void {
    enemy.hp -= amount;
    this.audio.playSfx("enemy_hit");
    const important = Boolean(feedback.important || enemy.isElite);
    if (feedback.showNumber !== false) {
      this.maybeShowDamageNumber(enemy, amount, important, feedback.color);
    }
    enemy.setTintFill(0xfff4d8);
    if (Math.random() < 0.32) {
      this.createBurst(enemy.x, enemy.y, 0xffe7b8, 2, 12, 90);
    }
    this.time.delayedCall(55, () => {
      if (enemy.active) {
        enemy.setTint(enemy.baseTint);
      }
    });

    if (enemy.hp <= 0) {
      this.killEnemy(enemy);
    }
  }

  private maybeShowDamageNumber(enemy: EnemySprite, amount: number, important: boolean, color?: number): void {
    const shouldShow = shouldShowDamageNumber({
      activeCount: this.damageNumberTexts.length,
      activeEnemies: this.enemies.countActive(true),
      important,
      roll: Math.random(),
      enabled: this.saveData.settings.damageNumbers
    });

    if (!shouldShow) {
      return;
    }

    this.showDamageNumber(enemy.x, enemy.y - enemy.def.radius - 8, amount, important, color);
  }

  private shakeCamera(durationMs: number, intensity: number): void {
    if (!shouldApplyScreenShake(this.saveData.settings)) {
      return;
    }

    this.cameras.main.shake(durationMs, intensity);
  }

  private showDamageNumber(x: number, y: number, amount: number, important: boolean, color?: number): void {
    const visual = getDamageNumberVisual({ amount, important });
    const label = this.add
      .text(x + Phaser.Math.Between(-6, 6), y, visual.text, {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: `${visual.fontSize}px`,
        fontStyle: "700",
        color: color === undefined ? visual.color : colorToCss(color),
        stroke: "#17110d",
        strokeThickness: important ? 3 : 2
      })
      .setOrigin(0.5)
      .setDepth(121);

    this.damageNumberTexts.push(label);
    this.tweens.add({
      targets: label,
      y: y - visual.riseDistance,
      alpha: 0,
      duration: visual.durationMs,
      ease: "Quad.easeOut",
      onComplete: () => {
        this.damageNumberTexts = this.damageNumberTexts.filter((text) => text !== label);
        label.destroy();
      }
    });
  }

  private killEnemy(enemy: EnemySprite): void {
    const { x, y, def } = enemy;
    const burstScale = enemy.isElite ? 1.7 : 1;
    const killedFinalBoss = enemy.scriptedSpawnId === "bone_knight_captain";
    enemy.disableBody(true, true);
    this.run.kills += 1;
    this.spawnPickup("xp", x, y, def.xpDrop);

    if (Math.random() < def.bonesDropChance) {
      this.spawnPickup(
        "bones",
        x + Phaser.Math.Between(-10, 10),
        y + Phaser.Math.Between(-10, 10),
        Phaser.Math.Between(def.bonesMin, def.bonesMax)
      );
    }

    this.createBurst(
      x,
      y,
      getDeathBurstColor(def.id),
      Math.round((def.id === "rot_walker" ? 9 : 6) * burstScale),
      Math.round(34 * burstScale),
      240
    );
    this.createRingBurst(x, y, getDeathBurstColor(def.id), (def.radius + 8) * burstScale);
    this.audio.playSfx("enemy_death");

    if (killedFinalBoss) {
      this.run.finalBossKilled = true;
      this.activeFinalBoss = null;

      if (hasWonNight(this.run)) {
        this.winRun();
      }
    }
  }

  private spawnPickup(type: PickupType, x: number, y: number, value: number): void {
    if (this.pickups.countActive(true) >= HARD_PICKUP_CAP) {
      if (this.mergePickupValue(type, x, y, value)) {
        return;
      }
    }

    spawnPickupEntity({
      scene: this,
      pickups: this.pickups,
      type,
      x,
      y,
      value
    });
  }

  private mergePickupValue(type: PickupType, x: number, y: number, value: number): boolean {
    return mergePickupEntityValue({
      pickups: this.pickups,
      type,
      x,
      y,
      value,
      onMerged: (pickup) => {
        this.createBurst(pickup.x, pickup.y, getPickupFxColor(type), 3, 14, 120);
      }
    });
  }

  private updatePickups(dt: number): void {
    updatePickupMovement({
      pickups: this.pickups,
      player: this.player,
      pickupRadius: this.run.upgrades.pickupRadius,
      collectRadius: PLAYER_RADIUS + 10,
      dt,
      onCollect: (pickup) => this.collectPickup(pickup)
    });
  }

  private collectPickup(pickup: PickupSprite): void {
    this.audio.playSfx(pickup.pickupType === "xp" ? "xp_pickup" : "bones_pickup");
    this.createBurst(
      pickup.x,
      pickup.y,
      getPickupFxColor(pickup.pickupType),
      pickup.pickupType === "xp" ? 4 : 5,
      18,
      140
    );

    if (pickup.pickupType === "xp") {
      this.run.xp += pickup.value;
      pickup.disableBody(true, true);
      this.checkLevelUp();
      return;
    }

    this.run.bonesCollected += pickup.value;
    pickup.disableBody(true, true);
  }

  private createBurst(
    x: number,
    y: number,
    color: number,
    count: number,
    distance: number,
    duration: number
  ): void {
    createBurstFx(this, x, y, color, count, distance, duration);
  }

  private createRingBurst(x: number, y: number, color: number, radius: number): void {
    createRingBurstFx(this, x, y, color, radius);
  }

  private createDamageRadiusRing(x: number, y: number, color: number, radius: number): void {
    createDamageRadiusRingFx(this, x, y, color, radius);
  }

  private showWorldText(x: number, y: number, text: string, color: string, fontSize: number): void {
    showWorldTextFx(this, x, y, text, color, fontSize);
  }

  private createLevelUpFlash(): void {
    this.createRingBurst(this.player.x, this.player.y, 0x8feaff, 120);
    const { width, height } = this.scale;
    const flash = this.add
      .rectangle(width / 2, height / 2, width, height, 0xf3dea6, 0.18)
      .setScrollFactor(0)
      .setDepth(1999);

    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 260,
      ease: "Quad.easeOut",
      onComplete: () => flash.destroy()
    });
  }

  private checkLevelUp(): void {
    if (this.run.xp < this.run.xpToNext || this.status !== "playing") {
      return;
    }

    this.run.xp -= this.run.xpToNext;
    this.run.level += 1;
    this.run.xpToNext = xpRequired(this.run.level);
    this.audio.playSfx("level_up");
    this.createLevelUpFlash();
    this.status = "level_up";
    this.playerKnockbackUntil = 0;
    this.playerKnockbackVelocity = { x: 0, y: 0 };
    this.player.setVelocity(0, 0);
    this.physics.pause();
    this.currentUpgradeOptions = selectUpgradeOptions(this.run.upgrades);
    this.showLevelUpOverlay();
  }

  private pickUpgradeByIndex(index: number): void {
    if (this.status !== "level_up") {
      return;
    }

    const upgrade = this.currentUpgradeOptions[index];

    if (!upgrade) {
      return;
    }

    const previousMaxHp = this.run.upgrades.maxHp;
    applyUpgrade(this.run.upgrades, upgrade.id);

    if (this.run.upgrades.maxHp > previousMaxHp) {
      this.run.hp += this.run.upgrades.maxHp - previousMaxHp;
    }

    this.currentUpgradeOptions = [];
    this.clearOverlay();
    this.status = "playing";
    this.physics.resume();
    this.checkLevelUp();
  }

  private endRun(): void {
    this.status = "game_over";
    this.playerKnockbackUntil = 0;
    this.playerKnockbackVelocity = { x: 0, y: 0 };
    this.player.setVelocity(0, 0);
    this.player.setTint(0x8a1d1d);
    this.physics.pause();
    this.audio.stopRunMusic();
    this.audio.playSfx("death");
    this.clearDamageNumbers();
    this.clearHints();
    this.setLowHpWarningVisible(false);
    this.activeFinalBoss = null;
    this.layoutHud();
    this.finalizeRun(false);
    this.showGameOverOverlay();
  }

  private winRun(): void {
    this.status = "victory";
    this.playerKnockbackUntil = 0;
    this.playerKnockbackVelocity = { x: 0, y: 0 };
    this.player.setVelocity(0, 0);
    this.physics.pause();
    this.audio.stopRunMusic();
    this.audio.playSfx("victory");
    this.clearDamageNumbers();
    this.clearHints();
    this.setLowHpWarningVisible(false);
    this.activeFinalBoss = null;
    this.layoutHud();
    this.finalizeRun(true);
    this.showVictoryOverlay();
  }

  private finalizeRun(won: boolean): RunEndSummary {
    if (this.runEndSummary) {
      return this.runEndSummary;
    }

    const summary = createRunEndSummary({
      droppedBones: this.run.bonesCollected,
      timeElapsed: this.run.timeElapsed,
      won,
      retentionBonus: getMetaRetentionBonus(this.saveData.meta)
    });
    this.saveData = applyRunEndSummaryToSave(this.saveData, summary, {
      kills: this.run.kills,
      level: this.run.level
    });
    this.persistSaveData();
    this.runEndSummary = summary;

    return summary;
  }

  private clearEntities(): void {
    clearPhysicsGroups([this.enemies, this.projectiles, this.pickups]);
    this.clearDamageNumbers();
    this.clearHints();
    this.pendingBellPulses = [];
    this.activeFinalBoss = null;
  }

  private showMainMenu(): void {
    this.status = "menu";
    this.physics.pause();
    this.audio.stopRunMusic();
    this.setHudVisible(false);
    this.clearDamageNumbers();
    this.clearHints();
    this.clearOverlay();
    renderMainMenuOverlay({
      scene: this,
      overlayObjects: this.overlayObjects,
      saveData: this.saveData,
      onStartRun: () => this.startRun(),
      onOpenSettings: () => this.showSettingsOverlay("menu"),
      onOpenMetaUpgrades: () => this.showMetaUpgradesOverlay(),
      onResetProgress: () => this.showResetProgressConfirmOverlay()
    });
  }

  private showPauseOverlay(): void {
    this.status = "paused";
    this.setHudVisible(true);
    this.clearOverlay();
    renderPauseOverlay({
      scene: this,
      overlayObjects: this.overlayObjects,
      run: this.run,
      onResume: () => this.resumeRun(),
      onOpenSettings: () => this.showSettingsOverlay("pause"),
      onRestart: () => this.startRun(),
      onMainMenu: () => this.showMainMenu()
    });
  }

  private showLevelUpOverlay(): void {
    this.clearOverlay();
    renderLevelUpOverlay({
      scene: this,
      overlayObjects: this.overlayObjects,
      currentUpgradeOptions: this.currentUpgradeOptions,
      getUpgradeStacks: (upgradeId) => this.run.upgrades.upgrades[upgradeId] ?? 0,
      onPickUpgrade: (index) => this.pickUpgradeByIndex(index)
    });
  }

  private showGameOverOverlay(): void {
    this.clearOverlay();
    this.setHudVisible(false);
    const summary = this.runEndSummary ?? this.finalizeRun(false);
    renderGameOverOverlay({
      scene: this,
      overlayObjects: this.overlayObjects,
      run: this.run,
      summary,
      saveBones: this.saveData.bones,
      onOpenMetaUpgrades: () => this.showMetaUpgradesOverlay(),
      onRestart: () => this.startRun(),
      onMainMenu: () => this.showMainMenu()
    });
  }

  private showVictoryOverlay(): void {
    this.clearOverlay();
    this.setHudVisible(false);
    const summary = this.runEndSummary ?? this.finalizeRun(true);
    renderVictoryOverlay({
      scene: this,
      overlayObjects: this.overlayObjects,
      run: this.run,
      summary,
      saveBones: this.saveData.bones,
      onOpenMetaUpgrades: () => this.showMetaUpgradesOverlay(),
      onRestart: () => this.startRun(),
      onMainMenu: () => this.showMainMenu()
    });
  }

  private showMetaUpgradesOverlay(): void {
    this.status = "meta_upgrades";
    this.physics.pause();
    this.setHudVisible(false);
    this.clearDamageNumbers();
    this.clearOverlay();
    renderMetaUpgradesOverlay({
      scene: this,
      overlayObjects: this.overlayObjects,
      saveData: this.saveData,
      onBuyMetaUpgrade: (id) => this.buyMetaUpgrade(id),
      onStartRun: () => this.startRun(),
      onBack: () => this.showMainMenu()
    });
  }

  private buyMetaUpgrade(id: MetaUpgradeId): void {
    const result = purchaseMetaUpgrade(this.saveData, id);

    if (result.purchased) {
      this.saveData = result.save;
      this.persistSaveData();
    }

    this.showMetaUpgradesOverlay();
  }

  private showSettingsOverlay(returnTarget: SettingsReturnTarget = this.settingsReturnTarget): void {
    this.settingsReturnTarget = returnTarget;
    this.status = "settings";
    this.physics.pause();
    this.setHudVisible(false);
    this.clearOverlay();
    renderSettingsOverlay({
      scene: this,
      overlayObjects: this.overlayObjects,
      settings: this.saveData.settings,
      onUpdateSettings: (patch) => this.updateGameSettings(patch),
      onClose: () => this.closeSettingsOverlay(),
      onResetProgress: () => this.showResetProgressConfirmOverlay()
    });
  }

  private updateGameSettings(patch: Partial<SettingsData>): void {
    const hadDamageNumbers = this.saveData.settings.damageNumbers;
    this.saveData = updateSettings(this.saveData, patch);
    this.audio.updateSettings(this.saveData.settings);
    this.persistSaveData();

    if (hadDamageNumbers && !this.saveData.settings.damageNumbers) {
      this.clearDamageNumbers();
    }

    this.showSettingsOverlay(this.settingsReturnTarget);
  }

  private closeSettingsOverlay(): void {
    if (this.settingsReturnTarget === "pause") {
      this.status = "paused";
      this.setHudVisible(true);
      this.showPauseOverlay();
      return;
    }

    this.showMainMenu();
  }

  private showResetProgressConfirmOverlay(): void {
    this.status = "reset_confirm";
    this.physics.pause();
    this.setHudVisible(false);
    this.clearOverlay();
    renderResetProgressConfirmOverlay({
      scene: this,
      overlayObjects: this.overlayObjects,
      onConfirm: () => {
        this.resetSaveData();
        this.showMainMenu();
      },
      onBack: () => this.showMainMenu()
    });
  }

  private clearOverlay(): void {
    clearOverlayObjects(this.overlayObjects);
    this.overlayObjects = [];
  }

  private clearDamageNumbers(): void {
    this.damageNumberTexts.forEach((label) => {
      this.tweens.killTweensOf(label);
      label.destroy();
    });
    this.damageNumberTexts = [];
  }

  private clearHints(): void {
    this.hintTimers.forEach((timer) => timer.remove(false));
    this.hintTimers = [];
    this.clearHintObjects();
  }

  private clearHintObjects(): void {
    this.hintObjects.forEach((object) => {
      this.tweens.killTweensOf(object);
      object.destroy();
    });
    this.hintObjects = [];
  }

  private setHudVisible(visible: boolean): void {
    this.hud.setVisible(visible);
  }

  private setLowHpWarningVisible(visible: boolean, alpha = 0): void {
    this.hud.setLowHpWarningVisible(visible, alpha);
  }

  private layoutHud(): void {
    this.hud.layout(this.getHudSnapshot());
  }

  private getHudSnapshot(): HudLayoutSnapshot {
    const run = this.run;
    const playerBody = this.player?.body as Phaser.Physics.Arcade.Body | null;
    const playerSpeed = playerBody ? Math.hypot(playerBody.velocity.x, playerBody.velocity.y) : 0;
    const hitCooldown = run
      ? Math.max(0, run.invulnerableUntil - run.timeElapsed, this.playerKnockbackUntil - run.timeElapsed)
      : 0;

    return {
      status: this.status,
      run: run
        ? {
            hp: run.hp,
            maxHp: run.upgrades.maxHp,
            xp: run.xp,
            xpToNext: run.xpToNext,
            level: run.level,
            timeElapsed: run.timeElapsed,
            kills: run.kills,
            bonesCollected: run.bonesCollected,
            spawnBudget: run.spawnBudget,
            upgrades: run.upgrades
          }
        : null,
      finalBoss: this.activeFinalBoss?.active
        ? {
            hp: this.activeFinalBoss.hp,
            maxHp: this.activeFinalBoss.maxHp
          }
        : null,
      balanceDebug: {
        fps: this.balanceDebugFps,
        playerSpeed,
        hitCooldown,
        activeEnemies: this.enemies.countActive(true),
        activeProjectiles: this.projectiles.countActive(true),
        activePickups: this.pickups.countActive(true)
      }
    };
  }
}

function getCurrentLocationSearch(): string {
  if (typeof globalThis.location === "undefined") {
    return "";
  }

  return globalThis.location.search;
}
