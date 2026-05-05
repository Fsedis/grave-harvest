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
  getSeparationPadding,
  getSeparationWeight,
  stepVelocityTowardTarget
} from "../domain/movement";
import { selectPickupMergeTarget, type PickupMergeCandidate } from "../domain/pickups";
import { xpRequired } from "../domain/progression";
import {
  ENEMY_SPAWN_CAPS,
  getScriptedEnemySpawns,
  getSpawnBudgetPerSecond,
  getSpawnPressureMultiplier,
  pickEnemyForBudget,
  type ScriptedEnemySpawn
} from "../domain/spawnDirector";
import { selectHomingTarget, type HomingTargetCandidate } from "../domain/homing";
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
  getBellPulseSpecs,
  type BellPulseSpec,
  type TimedDamageEffect
} from "../domain/weaponEffects";
import {
  applyUpgrade,
  createInitialUpgradeState,
  getDerivedWeaponStats,
  type DerivedWeaponStats,
  selectUpgradeOptions,
  type UpgradeDefinition,
  type UpgradeState
} from "../domain/upgrades";
import {
  getBellBurnTickDamage,
  getBleedingTargetKnifeDamage,
  getCrowBleedTickDamage,
  getCrowFlameBurstSpec,
  getKnifeBurnTickDamage,
  getKnifePierceBonus
} from "../domain/synergyEffects";
import { AudioManager } from "./audio/AudioManager";
import { getActiveSynergyFlags, type ActiveSynergyFlags } from "./combat/synergyFlags";
import {
  findNearestTarget,
  findRandomTarget,
  findTargetByRuntimeId,
  getHomingCandidatesFromTargets
} from "./combat/targeting";
import {
  applyTimedDamageToTarget,
  consumeTimedDamageForTarget,
  getTimedDamageColor,
  type TimedDamageType
} from "./combat/timedDamage";
import { colorToCss } from "./formatters/colors";
import { getDeathBurstColor, getEnemyDisplaySize, getEnemyTexture } from "./formatters/enemies";
import { clearPhysicsGroups } from "./entities/physicsGroups";
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
const ENEMY_SEPARATION_NEIGHBORS = 10;
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

type EnemySprite = Phaser.Physics.Arcade.Image & {
  runtimeId: number;
  burnEffect: TimedDamageEffect | null;
  bleedEffect: TimedDamageEffect | null;
  def: EnemyDefinition;
  hp: number;
  maxHp: number;
  spawnedAt: number;
  isElite: boolean;
  eliteName: string;
  nextDashAt: number;
  dashUntil: number;
  visualPulseSeed: number;
  baseDisplayWidth: number;
  baseDisplayHeight: number;
  baseTint: number;
  scriptedSpawnId: string;
};

type ProjectileSprite = Phaser.Physics.Arcade.Image & {
  damage: number;
  range: number;
  traveled: number;
  pierce: number;
  isCrit: boolean;
  damageTextColor: number;
  appliesBurn: boolean;
  appliesBleed: boolean;
  bonusAgainstBleeding: boolean;
  createsFlameBurst: boolean;
  hitEnemyIds: number[];
  kind: "knife" | "crow";
  targetEnemyId: number | null;
  homingSpeed: number;
  homingRange: number;
};

type DamageFeedbackOptions = {
  important?: boolean;
  color?: number;
  showNumber?: boolean;
};

type PendingBellPulse = {
  fireAt: number;
  pulse: BellPulseSpec;
};

type PickupSprite = Phaser.Physics.Arcade.Image & {
  pickupType: "xp" | "bones";
  value: number;
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
    this.createTextures();
    this.createArena();
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
    this.updateProjectiles(dt);
    if (this.status !== "playing") {
      return;
    }
    this.updatePickups(dt);
    if (this.status !== "playing") {
      return;
    }
    this.layoutHud();
  }

  private createTextures(): void {
    const graphics = this.add.graphics();

    graphics.fillStyle(0xe8dfc6, 1);
    graphics.fillCircle(18, 18, 16);
    graphics.lineStyle(3, 0x2b241f, 1);
    graphics.strokeCircle(18, 18, 16);
    graphics.generateTexture("player", 36, 36);
    graphics.clear();

    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(16, 9, 7);
    graphics.fillRoundedRect(11, 16, 10, 15, 3);
    graphics.lineStyle(2, 0x101010, 1);
    graphics.lineBetween(8, 20, 24, 20);
    graphics.lineBetween(12, 31, 8, 35);
    graphics.lineBetween(20, 31, 24, 35);
    graphics.generateTexture("enemy_skeleton", 32, 38);
    graphics.clear();

    graphics.fillStyle(0xffffff, 1);
    graphics.fillEllipse(18, 11, 30, 15);
    graphics.fillCircle(31, 9, 5);
    graphics.lineStyle(2, 0xffffff, 1);
    graphics.lineBetween(4, 12, 0, 17);
    graphics.generateTexture("enemy_grave_rat", 38, 24);
    graphics.clear();

    graphics.fillStyle(0xffffff, 1);
    graphics.fillRoundedRect(7, 7, 34, 38, 8);
    graphics.fillCircle(24, 9, 12);
    graphics.lineStyle(3, 0x101010, 1);
    graphics.lineBetween(13, 25, 35, 25);
    graphics.generateTexture("enemy_rot_walker", 48, 52);
    graphics.clear();

    graphics.fillStyle(0xffffff, 0.82);
    graphics.fillCircle(20, 16, 16);
    graphics.fillTriangle(5, 20, 35, 20, 20, 43);
    graphics.fillStyle(0x101010, 0.55);
    graphics.fillCircle(14, 15, 3);
    graphics.fillCircle(26, 15, 3);
    graphics.generateTexture("enemy_ghost", 40, 46);
    graphics.clear();

    graphics.fillStyle(0xffffff, 1);
    graphics.fillRoundedRect(6, 11, 40, 45, 8);
    graphics.fillCircle(26, 13, 14);
    graphics.fillStyle(0x101010, 0.9);
    graphics.fillRect(14, 12, 24, 5);
    graphics.generateTexture("enemy_bone_knight", 54, 62);
    graphics.clear();

    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(18, 18, 16);
    graphics.lineStyle(2, 0x101010, 1);
    graphics.strokeCircle(18, 18, 16);
    graphics.generateTexture("enemy", 36, 36);
    graphics.clear();

    graphics.fillStyle(0xf2ead0, 1);
    graphics.fillTriangle(5, 2, 30, 8, 5, 14);
    graphics.lineStyle(1, 0x1a1714, 1);
    graphics.strokeTriangle(5, 2, 30, 8, 5, 14);
    graphics.generateTexture("knife", 34, 16);
    graphics.clear();

    graphics.fillStyle(0xf2ead0, 1);
    graphics.fillTriangle(4, 4, 28, 11, 4, 18);
    graphics.lineStyle(2, 0x201810, 1);
    graphics.strokeTriangle(4, 4, 28, 11, 4, 18);
    graphics.generateTexture("weapon_bone_knives", 32, 22);
    graphics.clear();

    graphics.fillStyle(0xf7d779, 1);
    graphics.fillRoundedRect(12, 5, 8, 21, 3);
    graphics.fillStyle(0xfff0a8, 1);
    graphics.fillCircle(16, 5, 5);
    graphics.lineStyle(2, 0x513619, 1);
    graphics.strokeRoundedRect(12, 5, 8, 21, 3);
    graphics.generateTexture("weapon_holy_candle", 32, 32);
    graphics.clear();

    graphics.lineStyle(4, 0xd1c3a4, 1);
    graphics.strokeCircle(16, 16, 10);
    graphics.lineStyle(3, 0x5c4a35, 1);
    graphics.lineBetween(16, 6, 16, 2);
    graphics.lineBetween(8, 10, 4, 6);
    graphics.generateTexture("weapon_grave_bell", 32, 32);
    graphics.clear();

    graphics.fillStyle(0x20242a, 1);
    graphics.fillTriangle(5, 17, 17, 8, 14, 19);
    graphics.fillTriangle(14, 19, 24, 8, 27, 18);
    graphics.fillCircle(16, 17, 4);
    graphics.lineStyle(1, 0xa9b2c1, 1);
    graphics.strokeCircle(16, 17, 4);
    graphics.generateTexture("weapon_crow_swarm", 32, 32);
    graphics.clear();

    graphics.fillStyle(0x1d2229, 1);
    graphics.fillTriangle(2, 10, 16, 2, 13, 13);
    graphics.fillTriangle(13, 13, 27, 3, 30, 13);
    graphics.fillCircle(16, 13, 4);
    graphics.lineStyle(1, 0xa7b3c5, 0.8);
    graphics.strokeCircle(16, 13, 4);
    graphics.generateTexture("crow", 32, 20);
    graphics.clear();

    graphics.fillStyle(0x69d7ff, 1);
    graphics.fillCircle(8, 8, 6);
    graphics.lineStyle(2, 0xd8f7ff, 0.9);
    graphics.strokeCircle(8, 8, 6);
    graphics.generateTexture("xp", 16, 16);
    graphics.clear();

    graphics.fillStyle(0xe6d1a3, 1);
    graphics.fillCircle(8, 8, 5);
    graphics.lineStyle(2, 0x8a6a35, 1);
    graphics.strokeCircle(8, 8, 5);
    graphics.generateTexture("bones", 16, 16);
    graphics.destroy();
  }

  private createArena(): void {
    this.physics.world.setBounds(0, 0, MAP_SIZE, MAP_SIZE);
    this.cameras.main.setBounds(0, 0, MAP_SIZE, MAP_SIZE);

    this.add.rectangle(MAP_SIZE / 2, MAP_SIZE / 2, MAP_SIZE, MAP_SIZE, 0x121711).setDepth(-30);

    const ground = this.add.graphics().setDepth(-25);
    ground.fillStyle(0x171d15, 1);
    ground.fillRect(0, 0, MAP_SIZE, MAP_SIZE);
    ground.fillStyle(0x202018, 0.45);
    for (let index = 0; index < 42; index += 1) {
      const x = 70 + ((index * 211) % (MAP_SIZE - 140));
      const y = 80 + ((index * 157) % (MAP_SIZE - 160));
      ground.fillEllipse(x, y, 210 + (index % 5) * 34, 90 + (index % 4) * 22);
    }
    ground.fillStyle(0x0e130f, 0.26);
    for (let index = 0; index < 34; index += 1) {
      const x = 120 + ((index * 277) % (MAP_SIZE - 240));
      const y = 120 + ((index * 193) % (MAP_SIZE - 240));
      ground.fillEllipse(x, y, 140 + (index % 4) * 28, 60 + (index % 3) * 18);
    }

    const paths = this.add.graphics().setDepth(-22);
    paths.fillStyle(0x27231c, 0.72);
    paths.fillRoundedRect(170, MAP_SIZE / 2 - 70, MAP_SIZE - 340, 140, 58);
    paths.fillRoundedRect(MAP_SIZE / 2 - 78, 190, 156, MAP_SIZE - 380, 62);
    paths.fillStyle(0x3a3024, 0.28);
    for (let index = 0; index < 38; index += 1) {
      const x = 220 + ((index * 149) % (MAP_SIZE - 440));
      const y = MAP_SIZE / 2 - 42 + ((index * 37) % 84);
      paths.fillEllipse(x, y, 34, 14);
    }
    for (let index = 0; index < 34; index += 1) {
      const x = MAP_SIZE / 2 - 48 + ((index * 41) % 96);
      const y = 230 + ((index * 137) % (MAP_SIZE - 460));
      paths.fillEllipse(x, y, 28, 16);
    }

    const grid = this.add.graphics().setDepth(-10);
    grid.lineStyle(1, 0x2a3329, 0.18);
    for (let position = 0; position <= MAP_SIZE; position += 120) {
      grid.lineBetween(position, 0, position, MAP_SIZE);
      grid.lineBetween(0, position, MAP_SIZE, position);
    }

    const decor = this.add.graphics().setDepth(-5);
    for (let index = 0; index < 68; index += 1) {
      const x = 120 + ((index * 173) % (MAP_SIZE - 240));
      const y = 120 + ((index * 251) % (MAP_SIZE - 240));
      const variant = index % 4;
      decor.fillStyle(0x070908, 0.36);
      decor.fillEllipse(x + 13, y + 28, 44, 18);

      if (variant === 0) {
        decor.fillStyle(0x32382f, 1);
        decor.fillRoundedRect(x, y, 24, 38, 4);
        decor.fillStyle(0x1f251f, 0.8);
        decor.fillRect(x + 5, y + 9, 14, 3);
      } else if (variant === 1) {
        decor.fillStyle(0x3a3b34, 1);
        decor.fillRoundedRect(x - 2, y + 4, 28, 30, 3);
        decor.fillRect(x + 8, y - 8, 8, 14);
        decor.fillRect(x + 2, y - 2, 20, 6);
      } else if (variant === 2) {
        decor.fillStyle(0x272e28, 1);
        decor.fillRoundedRect(x - 4, y + 10, 34, 18, 5);
        decor.fillStyle(0x111611, 0.5);
        decor.fillRect(x, y + 16, 26, 3);
      } else {
        decor.fillStyle(0x30352f, 1);
        decor.fillRoundedRect(x + 2, y + 2, 20, 34, 10);
        decor.fillStyle(0x485044, 0.75);
        decor.fillCircle(x + 12, y + 11, 4);
      }
    }

    const trees = this.add.graphics().setDepth(-6);
    for (let index = 0; index < 18; index += 1) {
      const x = 160 + ((index * 307) % (MAP_SIZE - 320));
      const y = 170 + ((index * 419) % (MAP_SIZE - 340));
      trees.lineStyle(5, 0x1c1814, 0.9);
      trees.lineBetween(x, y, x + 8, y - 42);
      trees.lineStyle(3, 0x1c1814, 0.82);
      trees.lineBetween(x + 5, y - 28, x - 15, y - 52);
      trees.lineBetween(x + 7, y - 32, x + 28, y - 58);
      trees.fillStyle(0x080a08, 0.32);
      trees.fillEllipse(x + 8, y + 3, 46, 16);
    }

    const border = this.add.graphics().setDepth(-4);
    border.lineStyle(22, 0x2e271f, 1);
    border.strokeRect(8, 8, MAP_SIZE - 16, MAP_SIZE - 16);
    border.lineStyle(4, 0x514334, 0.9);
    border.strokeRect(28, 28, MAP_SIZE - 56, MAP_SIZE - 56);
    border.fillStyle(0x1c1712, 1);
    for (let position = 64; position < MAP_SIZE - 64; position += 96) {
      border.fillRect(position, 4, 12, 40);
      border.fillRect(position, MAP_SIZE - 44, 12, 40);
      border.fillRect(4, position, 40, 12);
      border.fillRect(MAP_SIZE - 44, position, 40, 12);
    }

    const fog = this.add.graphics().setDepth(-3);
    fog.fillStyle(0x9aa091, 0.06);
    fog.fillRect(0, 0, MAP_SIZE, 90);
    fog.fillRect(0, MAP_SIZE - 90, MAP_SIZE, 90);
    fog.fillRect(0, 0, 90, MAP_SIZE);
    fog.fillRect(MAP_SIZE - 90, 0, 90, MAP_SIZE);
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
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const radius = scripted ? Phaser.Math.Between(560, 720) : Phaser.Math.Between(520, 860);
    const x = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * radius, 40, MAP_SIZE - 40);
    const y = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * radius, 40, MAP_SIZE - 40);

    if (scripted && this.enemies.countActive(true) >= HARD_ENEMY_CAP) {
      this.freeEnemySlotForScriptedSpawn();
    }

    const enemy = this.enemies.get(x, y, getEnemyTexture(definition.id)) as EnemySprite | null;

    if (!enemy) {
      return null;
    }

    const scaleMultiplier = scripted?.scaleMultiplier ?? 1;
    const display = getEnemyDisplaySize(definition);
    enemy.runtimeId = this.nextEnemyRuntimeId;
    this.nextEnemyRuntimeId += 1;
    enemy.burnEffect = null;
    enemy.bleedEffect = null;
    enemy.def = definition;
    enemy.hp = Math.round(definition.hp * (scripted?.hpMultiplier ?? 1));
    enemy.maxHp = enemy.hp;
    enemy.spawnedAt = this.run.timeElapsed;
    enemy.isElite = Boolean(scripted);
    enemy.eliteName = scripted?.name ?? "";
    enemy.nextDashAt = definition.behavior === "dash" ? this.run.timeElapsed + 1.4 : Number.POSITIVE_INFINITY;
    enemy.dashUntil = 0;
    enemy.visualPulseSeed = Phaser.Math.FloatBetween(0, Math.PI * 2);
    enemy.baseDisplayWidth = display.width * scaleMultiplier;
    enemy.baseDisplayHeight = display.height * scaleMultiplier;
    enemy.baseTint = scripted?.color ?? definition.color;
    enemy.scriptedSpawnId = scripted?.id ?? "";
    enemy.setTexture(getEnemyTexture(definition.id));
    enemy.setActive(true);
    enemy.setVisible(true);
    enemy.enableBody(true, x, y, true, true);
    enemy.setSize(definition.radius * 1.6, definition.radius * 1.6);
    enemy.setDisplaySize(enemy.baseDisplayWidth, enemy.baseDisplayHeight);
    enemy.setTint(enemy.baseTint);
    enemy.setAlpha(definition.id === "ghost" ? 0.72 : 1);
    enemy.setDepth(scripted ? 17 : 15);

    return enemy;
  }

  private freeEnemySlotForScriptedSpawn(): void {
    for (const child of this.enemies.getChildren()) {
      const enemy = child as EnemySprite;

      if (enemy.active && !enemy.isElite) {
        enemy.disableBody(true, true);
        return;
      }
    }
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

      const separation = this.calculateEnemySeparation(enemy);
      const movement = direction.add(separation.scale(separationStrength));

      if (movement.lengthSq() > 0) {
        movement.normalize();
      }

      enemy.setVelocity(movement.x * speed, movement.y * speed);
      this.updateEnemyVisual(enemy);

      if (distance < PLAYER_RADIUS + enemy.def.radius && this.run.timeElapsed >= this.run.invulnerableUntil) {
        this.damagePlayer(enemy.def.damage, enemy);
      }

      if (dt > 0 && distance < PLAYER_RADIUS + enemy.def.radius + 10) {
        enemy.x -= direction.x * 18 * dt;
        enemy.y -= direction.y * 18 * dt;
      }
    }
  }

  private updateEnemyVisual(enemy: EnemySprite): void {
    if (enemy.def.id === "ghost") {
      const phase = (this.run.timeElapsed - enemy.spawnedAt) * 4.2 + enemy.visualPulseSeed;
      enemy.setAlpha(0.58 + Math.sin(phase) * 0.16);
    }

    if (enemy.isElite) {
      const pulse = 1 + Math.sin(this.run.timeElapsed * 4 + enemy.visualPulseSeed) * 0.035;
      enemy.setDisplaySize(enemy.baseDisplayWidth * pulse, enemy.baseDisplayHeight * pulse);
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
        this.fireBoneKnives(stats, synergyFlags);
      } else if (weaponId === "holy_candle") {
        this.tickHolyCandle(stats, synergyFlags);
      } else if (weaponId === "grave_bell") {
        this.ringGraveBell(stats, synergyFlags);
      } else if (weaponId === "crow_swarm") {
        this.releaseCrowSwarm(stats, synergyFlags);
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
        this.applyBellPulse(pendingPulse.pulse, synergyFlags);
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

  private fireBoneKnives(stats: DerivedWeaponStats, synergyFlags: ActiveSynergyFlags): void {
    for (let index = 0; index < stats.projectileCount; index += 1) {
      const target = this.findNearestEnemy(stats.range);

      if (!target) {
        return;
      }

      this.fireKnifeAt(target, stats, index, stats.projectileCount, synergyFlags);
    }
  }

  private findNearestEnemy(range: number): EnemySprite | null {
    return findNearestTarget(this.enemies.getChildren() as EnemySprite[], this.player, range);
  }

  private findRandomEnemy(range: number): EnemySprite | null {
    return findRandomTarget(this.enemies.getChildren() as EnemySprite[], this.player, range, (max) =>
      Phaser.Math.Between(0, max)
    );
  }

  private fireKnifeAt(
    target: EnemySprite,
    stats: DerivedWeaponStats,
    index: number,
    total: number,
    synergyFlags: ActiveSynergyFlags
  ): void {
    if (this.projectiles.countActive(true) >= HARD_PROJECTILE_CAP) {
      return;
    }

    const projectile = this.projectiles.get(this.player.x, this.player.y, "knife") as ProjectileSprite | null;

    if (!projectile) {
      return;
    }

    const aim = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
    const spread = total > 1 ? Phaser.Math.DegToRad((index - (total - 1) / 2) * 9) : 0;
    const angle = aim + spread;
    const speed = stats.projectileSpeed ?? 420;
    const crit = Math.random() < this.run.upgrades.critChance;
    const critMultiplier = crit ? this.run.upgrades.critDamage : 1;

    projectile.damage = Math.round(stats.damage * critMultiplier);
    projectile.range = stats.range;
    projectile.traveled = 0;
    projectile.pierce = (stats.pierce ?? 0) + (synergyFlags.knivesPierce ? getKnifePierceBonus() : 0);
    projectile.isCrit = crit;
    projectile.damageTextColor = crit ? 0xf2d36b : 0xf3ead0;
    projectile.appliesBurn = synergyFlags.knivesApplyBurn;
    projectile.appliesBleed = false;
    projectile.bonusAgainstBleeding = synergyFlags.knivesBleedBonus;
    projectile.createsFlameBurst = false;
    projectile.hitEnemyIds = [];
    projectile.kind = "knife";
    projectile.targetEnemyId = null;
    projectile.homingSpeed = 0;
    projectile.homingRange = 0;
    projectile.setTexture("knife");
    projectile.setActive(true);
    projectile.setVisible(true);
    projectile.enableBody(true, this.player.x, this.player.y, true, true);
    projectile.setDepth(18);
    projectile.setRotation(angle);
    projectile.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.audio.playSfx("knife_shot");
  }

  private tickHolyCandle(stats: DerivedWeaponStats, _synergyFlags: ActiveSynergyFlags): void {
    this.createDamageRadiusRing(this.player.x, this.player.y, 0xf7d779, stats.radius);

    for (const child of this.enemies.getChildren()) {
      const enemy = child as EnemySprite;

      if (!enemy.active) {
        continue;
      }

      const distanceSq = Phaser.Math.Distance.Squared(this.player.x, this.player.y, enemy.x, enemy.y);

      if (distanceSq <= stats.radius * stats.radius) {
        this.damageEnemy(enemy, Math.max(1, Math.round(stats.damage)), {
          important: enemy.isElite,
          color: 0xf7d779
        });

        if (stats.burn && enemy.active) {
          this.applyTimedDamageEffect(enemy, "burn", Math.max(1, Math.round(stats.damage * 0.35)));
        }
      }
    }
  }

  private ringGraveBell(stats: DerivedWeaponStats, synergyFlags: ActiveSynergyFlags): void {
    getBellPulseSpecs({
      damage: stats.damage,
      pulseCount: stats.pulseCount,
      radius: stats.radius
    }).forEach((pulse) => {
      if (pulse.delayMs === 0) {
        this.applyBellPulse(pulse, synergyFlags);
        return;
      }

      this.pendingBellPulses.push({
        fireAt: this.run.timeElapsed + pulse.delayMs / 1000,
        pulse
      });
    });
  }

  private applyBellPulse(pulse: BellPulseSpec, synergyFlags: ActiveSynergyFlags): void {
    this.createDamageRadiusRing(this.player.x, this.player.y, 0xcdbb8d, pulse.radius);
    this.shakeCamera(pulse.index === 0 ? 80 : 110, pulse.index === 0 ? 0.003 : 0.004);
    this.audio.playSfx("bell_pulse");

    for (const child of this.enemies.getChildren()) {
      const enemy = child as EnemySprite;

      if (!enemy.active) {
        continue;
      }

      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);

      if (distance <= pulse.radius) {
        this.damageEnemy(enemy, pulse.damage, {
          important: enemy.isElite || pulse.index > 0,
          color: 0xcdbb8d
        });

        if (enemy.active && synergyFlags.bellCandleBurn) {
          this.applyTimedDamageEffect(enemy, "burn", getBellBurnTickDamage(pulse.damage));
        }

        if (enemy.active && distance > 0) {
          const knockback = (pulse.index === 0 ? 42 : 58) * (1 - enemy.def.knockbackResistance);
          enemy.x += ((enemy.x - this.player.x) / distance) * knockback;
          enemy.y += ((enemy.y - this.player.y) / distance) * knockback;
        }
      }
    }

    if (synergyFlags.bellBonusCrow) {
      this.releaseBonusCrowFromBell(synergyFlags);
    }
  }

  private releaseCrowSwarm(stats: DerivedWeaponStats, synergyFlags: ActiveSynergyFlags): void {
    for (let index = 0; index < stats.projectileCount; index += 1) {
      const target = this.findRandomEnemy(stats.range);

      if (!target) {
        return;
      }

      this.fireCrowAt(target, stats, index, stats.projectileCount, synergyFlags);
    }
  }

  private releaseBonusCrowFromBell(synergyFlags: ActiveSynergyFlags): void {
    if (!this.run.upgrades.weapons.includes("crow_swarm")) {
      return;
    }

    const stats = getDerivedWeaponStats(this.run.upgrades, "crow_swarm");
    const target = this.findRandomEnemy(stats.range);

    if (!target) {
      return;
    }

    this.createBurst(this.player.x, this.player.y, 0x1f1b24, 4, 18, 140);
    this.fireCrowAt(target, stats, 0, 1, synergyFlags);
  }

  private fireCrowAt(
    target: EnemySprite,
    stats: DerivedWeaponStats,
    index: number,
    total: number,
    synergyFlags: ActiveSynergyFlags
  ): void {
    if (this.projectiles.countActive(true) >= HARD_PROJECTILE_CAP) {
      return;
    }

    const projectile = this.projectiles.get(this.player.x, this.player.y, "crow") as ProjectileSprite | null;

    if (!projectile) {
      return;
    }

    const aim = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
    const spread = total > 1 ? Phaser.Math.DegToRad((index - (total - 1) / 2) * 14) : 0;
    const angle = aim + spread;

    projectile.damage = Math.round(stats.damage);
    projectile.range = stats.range * 1.7;
    projectile.traveled = 0;
    projectile.pierce = 0;
    projectile.isCrit = false;
    projectile.damageTextColor = 0xf3ead0;
    projectile.appliesBurn = false;
    projectile.appliesBleed = stats.bleed || synergyFlags.knivesBleedBonus;
    projectile.bonusAgainstBleeding = false;
    projectile.createsFlameBurst = synergyFlags.crowsFlameBurst;
    projectile.hitEnemyIds = [];
    projectile.kind = "crow";
    projectile.targetEnemyId = target.runtimeId;
    projectile.homingSpeed = 540;
    projectile.homingRange = stats.range;
    projectile.setTexture("crow");
    projectile.setActive(true);
    projectile.setVisible(true);
    projectile.enableBody(true, this.player.x, this.player.y, true, true);
    projectile.setDepth(19);
    projectile.setRotation(angle);
    projectile.setVelocity(Math.cos(angle) * projectile.homingSpeed, Math.sin(angle) * projectile.homingSpeed);
    this.audio.playSfx("crow_attack");
  }

  private updateProjectiles(dt: number): void {
    for (const child of this.projectiles.getChildren()) {
      const projectile = child as ProjectileSprite;

      if (!projectile.active) {
        continue;
      }

      const body = projectile.body as Phaser.Physics.Arcade.Body;

      if (projectile.kind === "crow") {
        this.updateCrowProjectile(projectile);

        if (!projectile.active) {
          continue;
        }
      }

      projectile.traveled += body.velocity.length() * dt;

      if (projectile.traveled >= projectile.range) {
        projectile.disableBody(true, true);
        continue;
      }

      for (const enemyChild of this.enemies.getChildren()) {
        const enemy = enemyChild as EnemySprite;

        if (!enemy.active) {
          continue;
        }

        if (projectile.hitEnemyIds.includes(enemy.runtimeId)) {
          continue;
        }

        const hitDistance = enemy.def.radius + 8;
        const distanceSq = Phaser.Math.Distance.Squared(projectile.x, projectile.y, enemy.x, enemy.y);

        if (distanceSq <= hitDistance * hitDistance) {
          projectile.hitEnemyIds.push(enemy.runtimeId);
          const hitX = enemy.x;
          const hitY = enemy.y;
          const hitDamage =
            projectile.bonusAgainstBleeding && enemy.bleedEffect
              ? getBleedingTargetKnifeDamage(projectile.damage)
              : projectile.damage;

          this.damageEnemy(enemy, hitDamage, {
            important: projectile.isCrit || enemy.isElite,
            color: projectile.damageTextColor
          });
          if (enemy.active && projectile.appliesBurn) {
            this.applyTimedDamageEffect(enemy, "burn", getKnifeBurnTickDamage(hitDamage));
          }
          if (enemy.active && projectile.appliesBleed) {
            this.applyTimedDamageEffect(enemy, "bleed", getCrowBleedTickDamage(hitDamage));
          }
          if (projectile.createsFlameBurst) {
            this.createCrowFlameBurst(hitX, hitY, hitDamage);
          }
          if (projectile.pierce > 0) {
            projectile.pierce -= 1;
            projectile.damage = Math.max(1, Math.round(projectile.damage * 0.5));
            this.createBurst(projectile.x, projectile.y, 0x9aa8bd, 3, 14, 120);
          } else {
            projectile.disableBody(true, true);
          }
          break;
        }
      }
    }
  }

  private createCrowFlameBurst(x: number, y: number, hitDamage: number): void {
    const burst = getCrowFlameBurstSpec(hitDamage);
    this.createDamageRadiusRing(x, y, 0xf7944d, burst.radius);
    this.createBurst(x, y, 0xf7944d, 6, 28, 180);

    for (const child of this.enemies.getChildren()) {
      const enemy = child as EnemySprite;

      if (!enemy.active) {
        continue;
      }

      const distanceSq = Phaser.Math.Distance.Squared(x, y, enemy.x, enemy.y);

      if (distanceSq <= burst.radius * burst.radius) {
        this.damageEnemy(enemy, burst.damage, {
          important: enemy.isElite,
          color: 0xf7944d
        });

        if (enemy.active) {
          this.applyTimedDamageEffect(enemy, "burn", burst.burnTickDamage);
        }
      }
    }
  }

  private updateCrowProjectile(projectile: ProjectileSprite): void {
    const targetId = selectHomingTarget(
      projectile.targetEnemyId,
      projectile.homingRange,
      this.getHomingCandidates(projectile.x, projectile.y)
    );
    projectile.targetEnemyId = targetId;

    if (targetId === null) {
      projectile.disableBody(true, true);
      return;
    }

    const target = this.findEnemyByRuntimeId(targetId);

    if (!target) {
      projectile.disableBody(true, true);
      return;
    }

    const angle = Phaser.Math.Angle.Between(projectile.x, projectile.y, target.x, target.y);
    projectile.setRotation(angle);
    projectile.setVelocity(
      Math.cos(angle) * projectile.homingSpeed,
      Math.sin(angle) * projectile.homingSpeed
    );
  }

  private getHomingCandidates(x: number, y: number): HomingTargetCandidate[] {
    return getHomingCandidatesFromTargets(this.enemies.getChildren() as EnemySprite[], { x, y });
  }

  private findEnemyByRuntimeId(runtimeId: number): EnemySprite | null {
    return findTargetByRuntimeId(this.enemies.getChildren() as EnemySprite[], runtimeId);
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

  private spawnPickup(type: PickupSprite["pickupType"], x: number, y: number, value: number): void {
    if (this.pickups.countActive(true) >= HARD_PICKUP_CAP) {
      if (this.mergePickupValue(type, x, y, value)) {
        return;
      }
    }

    const pickup = this.pickups.get(x, y, type === "xp" ? "xp" : "bones") as PickupSprite | null;

    if (!pickup) {
      return;
    }

    pickup.pickupType = type;
    pickup.value = value;
    pickup.setActive(true);
    pickup.setVisible(true);
    pickup.enableBody(true, x, y, true, true);
    pickup.setDepth(10);
    pickup.setScale(0.65);
    pickup.setVelocity(Phaser.Math.Between(-40, 40), Phaser.Math.Between(-40, 40));
    pickup.setDrag(260);
    this.tweens.add({
      targets: pickup,
      scale: 1,
      duration: 180,
      ease: "Back.easeOut"
    });
  }

  private mergePickupValue(type: PickupSprite["pickupType"], x: number, y: number, value: number): boolean {
    const activePickups = this.pickups
      .getChildren()
      .map((child, index) => ({ pickup: child as PickupSprite, id: String(index) }))
      .filter(({ pickup }) => pickup.active);
    const candidates: PickupMergeCandidate[] = activePickups.map(({ pickup, id }) => ({
      id,
      type: pickup.pickupType,
      x: pickup.x,
      y: pickup.y,
      value: pickup.value
    }));
    const target = selectPickupMergeTarget({
      type,
      x,
      y,
      candidates
    });

    if (!target) {
      return false;
    }

    const targetPickup = activePickups.find(({ id }) => id === target.id)?.pickup;

    if (!targetPickup) {
      return false;
    }

    targetPickup.value += value;
    this.createBurst(targetPickup.x, targetPickup.y, type === "xp" ? 0x69d7ff : 0xe6d1a3, 3, 14, 120);

    return true;
  }

  private updatePickups(dt: number): void {
    for (const child of this.pickups.getChildren()) {
      const pickup = child as PickupSprite;

      if (!pickup.active) {
        continue;
      }

      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, pickup.x, pickup.y);

      if (distance <= this.run.upgrades.pickupRadius) {
        const direction = new Phaser.Math.Vector2(this.player.x - pickup.x, this.player.y - pickup.y);

        if (direction.lengthSq() > 0) {
          direction.normalize();
          pickup.x += direction.x * 320 * dt;
          pickup.y += direction.y * 320 * dt;
        }
      }

      if (distance <= PLAYER_RADIUS + 10) {
        this.collectPickup(pickup);
      }
    }
  }

  private collectPickup(pickup: PickupSprite): void {
    this.audio.playSfx(pickup.pickupType === "xp" ? "xp_pickup" : "bones_pickup");
    this.createBurst(
      pickup.x,
      pickup.y,
      pickup.pickupType === "xp" ? 0x69d7ff : 0xe6d1a3,
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

  private calculateEnemySeparation(enemy: EnemySprite): Phaser.Math.Vector2 {
    const separation = new Phaser.Math.Vector2(0, 0);
    let neighbors = 0;

    for (const child of this.enemies.getChildren()) {
      const other = child as EnemySprite;

      if (!other.active || other === enemy) {
        continue;
      }

      const minDistance =
        enemy.def.radius +
        other.def.radius +
        Math.max(getSeparationPadding(enemy.def.id), getSeparationPadding(other.def.id));
      const offsetX = enemy.x - other.x;
      const offsetY = enemy.y - other.y;
      const distanceSq = offsetX * offsetX + offsetY * offsetY;

      if (distanceSq <= 0 || distanceSq > minDistance * minDistance) {
        continue;
      }

      const distance = Math.sqrt(distanceSq);
      const force = (1 - distance / minDistance) * getSeparationWeight(enemy.def.id);
      separation.x += (offsetX / distance) * force;
      separation.y += (offsetY / distance) * force;
      neighbors += 1;

      if (neighbors >= ENEMY_SEPARATION_NEIGHBORS) {
        break;
      }
    }

    return separation;
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
