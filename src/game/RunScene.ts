import Phaser from "phaser";
import { getEnemyDefinition, type EnemyDefinition } from "../data/enemies";
import {
  getDamageNumberVisual,
  getDamageRadiusRingVisual,
  getDecorativeRingVisual,
  isLowHp,
  shouldShowDamageNumber,
  type RingVisual
} from "../domain/effects";
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
  canBuyMetaUpgrade,
  getMetaRetentionBonus,
  getMetaUpgradeCost,
  META_UPGRADE_DEFINITIONS,
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
  persistSave,
  resetSave,
  type SaveData,
  type StorageLike
} from "../domain/save";
import {
  consumeTimedDamageTicks,
  createTimedDamageEffect,
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

const MAP_SIZE = 2200;
const PLAYER_RADIUS = 16;
const HARD_ENEMY_CAP = ENEMY_SPAWN_CAPS.hard;
const HARD_PROJECTILE_CAP = 300;
const HARD_PICKUP_CAP = 400;
const PLAYER_INVULNERABILITY_SECONDS = 0.35;
const ENEMY_SEPARATION_STRENGTH = 0.92;
const ENEMY_SEPARATION_NEIGHBORS = 8;

type RunStatus =
  | "menu"
  | "playing"
  | "paused"
  | "level_up"
  | "game_over"
  | "victory"
  | "meta_upgrades"
  | "reset_confirm";

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
  appliesBleed: boolean;
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
  private hudObjects: Array<Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text> = [];
  private hpFill!: Phaser.GameObjects.Rectangle;
  private xpBack!: Phaser.GameObjects.Rectangle;
  private xpFill!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private bonesText!: Phaser.GameObjects.Text;
  private killText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private weaponPanel!: Phaser.GameObjects.Rectangle;
  private weaponIcons: Phaser.GameObjects.Image[] = [];
  private weaponTexts: Phaser.GameObjects.Text[] = [];
  private bossHpBack!: Phaser.GameObjects.Rectangle;
  private bossHpFill!: Phaser.GameObjects.Rectangle;
  private bossHpText!: Phaser.GameObjects.Text;
  private lowHpEdges: Phaser.GameObjects.Rectangle[] = [];
  private damageNumberTexts: Phaser.GameObjects.Text[] = [];
  private nextEnemyRuntimeId = 1;
  private pendingBellPulses: PendingBellPulse[] = [];
  private activeFinalBoss: EnemySprite | null = null;
  private saveData: SaveData = createDefaultSaveData();
  private runEndSummary: RunEndSummary | null = null;

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
  }

  create(): void {
    this.loadSaveData();
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

    this.run.timeElapsed += dt;
    this.updatePlayerMovement();
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

    this.add.rectangle(MAP_SIZE / 2, MAP_SIZE / 2, MAP_SIZE, MAP_SIZE, 0x151a16).setDepth(-20);

    const grid = this.add.graphics().setDepth(-10);
    grid.lineStyle(1, 0x263025, 0.35);
    for (let position = 0; position <= MAP_SIZE; position += 120) {
      grid.lineBetween(position, 0, position, MAP_SIZE);
      grid.lineBetween(0, position, MAP_SIZE, position);
    }

    const decor = this.add.graphics().setDepth(-5);
    decor.fillStyle(0x30362e, 1);
    for (let index = 0; index < 46; index += 1) {
      const x = 120 + ((index * 173) % (MAP_SIZE - 240));
      const y = 120 + ((index * 251) % (MAP_SIZE - 240));
      decor.fillRoundedRect(x, y, 22, 36, 3);
      decor.fillRect(x + 7, y - 8, 8, 12);
    }

    const border = this.add.graphics().setDepth(-4);
    border.lineStyle(16, 0x3b332d, 1);
    border.strokeRect(8, 8, MAP_SIZE - 16, MAP_SIZE - 16);
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
      } else if (this.status === "meta_upgrades" || this.status === "reset_confirm") {
        this.showMainMenu();
      }
    });
  }

  private createHud(): void {
    const hpBack = this.add.rectangle(24, 24, 260, 18, 0x241516, 0.9).setOrigin(0, 0);
    this.hpFill = this.add.rectangle(24, 24, 260, 18, 0xb23a3a, 1).setOrigin(0, 0);
    this.hpText = this.add.text(24, 46, "", { fontSize: "16px", color: "#f6ead4" });
    this.levelText = this.add.text(24, 68, "", { fontSize: "16px", color: "#cdd6b8" });
    this.timerText = this.add.text(0, 20, "00:00", {
      fontSize: "34px",
      color: "#f6ead4",
      fontStyle: "700"
    });
    this.bonesText = this.add.text(0, 24, "", { fontSize: "18px", color: "#e5d39f" });
    this.killText = this.add.text(0, 50, "", { fontSize: "16px", color: "#c9c0ad" });
    this.xpBack = this.add.rectangle(24, 0, 100, 12, 0x10222a, 0.95).setOrigin(0, 0);
    this.xpFill = this.add.rectangle(24, 0, 100, 12, 0x55bde0, 1).setOrigin(0, 0);
    this.weaponPanel = this.add.rectangle(24, 0, 276, 40, 0x111612, 0.88).setOrigin(0, 0);
    this.weaponPanel.setStrokeStyle(1, 0x47513f, 0.9);
    this.bossHpBack = this.add.rectangle(0, 0, 440, 14, 0x261615, 0.95).setOrigin(0, 0);
    this.bossHpBack.setStrokeStyle(1, 0x6b5a3c, 0.95);
    this.bossHpFill = this.add.rectangle(0, 0, 440, 14, 0xb44a3c, 1).setOrigin(0, 0);
    this.bossHpText = this.add.text(0, 0, "", {
      fontSize: "16px",
      color: "#f2dfb0",
      fontStyle: "700"
    });
    this.lowHpEdges = [
      this.add.rectangle(0, 0, 0, 0, 0x8b1515, 0).setOrigin(0, 0),
      this.add.rectangle(0, 0, 0, 0, 0x8b1515, 0).setOrigin(0, 0),
      this.add.rectangle(0, 0, 0, 0, 0x8b1515, 0).setOrigin(0, 0),
      this.add.rectangle(0, 0, 0, 0, 0x8b1515, 0).setOrigin(0, 0)
    ];
    this.weaponIcons = [];
    this.weaponTexts = [];

    for (let index = 0; index < 4; index += 1) {
      this.weaponIcons.push(this.add.image(0, 0, "weapon_bone_knives"));
      this.weaponTexts.push(this.add.text(0, 0, "", { fontSize: "14px", color: "#efe3c8" }));
    }

    this.hudObjects = [
      hpBack,
      this.hpFill,
      this.hpText,
      this.levelText,
      this.timerText,
      this.bonesText,
      this.killText,
      this.xpBack,
      this.xpFill,
      this.weaponPanel,
      ...this.weaponIcons,
      ...this.weaponTexts,
      this.bossHpBack,
      this.bossHpFill,
      this.bossHpText,
      ...this.lowHpEdges
    ];

    this.hudObjects.forEach((object) => object.setScrollFactor(0).setDepth(1000));
    this.lowHpEdges.forEach((edge) => edge.setDepth(999));
    this.layoutHud();
    this.setHudVisible(false);
  }

  private startRun(): void {
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
    this.setLowHpWarningVisible(false);
    this.player.enableBody(true, MAP_SIZE / 2, MAP_SIZE / 2, true, true);
    this.player.clearTint();
    this.player.setVelocity(0, 0);
    this.cameras.main.startFollow(this.player, true, 0.14, 0.14);
    this.physics.resume();
    this.status = "playing";
    this.setHudVisible(true);
    this.layoutHud();
  }

  private pauseRun(): void {
    this.status = "paused";
    this.physics.pause();
    this.setLowHpWarningVisible(false);
    this.showPauseOverlay();
  }

  private resumeRun(): void {
    this.clearOverlay();
    this.status = "playing";
    this.physics.resume();
  }

  private updatePlayerMovement(): void {
    let xAxis = 0;
    let yAxis = 0;

    if (this.cursors.left?.isDown || this.wasd.a.isDown) {
      xAxis -= 1;
    }
    if (this.cursors.right?.isDown || this.wasd.d.isDown) {
      xAxis += 1;
    }
    if (this.cursors.up?.isDown || this.wasd.w.isDown) {
      yAxis -= 1;
    }
    if (this.cursors.down?.isDown || this.wasd.s.isDown) {
      yAxis += 1;
    }

    const direction = new Phaser.Math.Vector2(xAxis, yAxis);

    if (direction.lengthSq() > 0) {
      direction.normalize().scale(this.run.upgrades.moveSpeed);
    }

    this.player.setVelocity(direction.x, direction.y);
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
      this.cameras.main.shake(spawn.id === "bone_knight_captain" ? 260 : 160, 0.005);
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
        this.damagePlayer(enemy.def.damage);
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

  private damagePlayer(amount: number): void {
    this.run.hp = Math.max(0, this.run.hp - amount);
    this.run.invulnerableUntil = this.run.timeElapsed + PLAYER_INVULNERABILITY_SECONDS;
    this.player.setTintFill(0xff5a54);
    this.cameras.main.shake(120, 0.006);
    this.createBurst(this.player.x, this.player.y, 0xff5a54, 5, 22, 150);
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
      this.run.weaponCooldowns[weaponId] = stats.cooldown;

      if (weaponId === "bone_knives") {
        this.fireBoneKnives(stats);
      } else if (weaponId === "holy_candle") {
        this.tickHolyCandle(stats);
      } else if (weaponId === "grave_bell") {
        this.ringGraveBell(stats);
      } else if (weaponId === "crow_swarm") {
        this.releaseCrowSwarm(stats);
      }
    }
  }

  private updatePendingBellPulses(): void {
    if (this.pendingBellPulses.length === 0) {
      return;
    }

    const stillPending: PendingBellPulse[] = [];

    for (const pendingPulse of this.pendingBellPulses) {
      if (pendingPulse.fireAt <= this.run.timeElapsed) {
        this.applyBellPulse(pendingPulse.pulse);
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
    effectType: "burn" | "bleed",
    color: number
  ): void {
    const field = effectType === "burn" ? "burnEffect" : "bleedEffect";
    const effect = enemy[field];

    if (!effect) {
      return;
    }

    const result = consumeTimedDamageTicks(effect, this.run.timeElapsed);
    enemy[field] = result.active ? result.effect : null;

    for (let tick = 0; tick < result.ticks && enemy.active; tick += 1) {
      this.damageEnemy(enemy, effect.damagePerTick, {
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
    effectType: "burn" | "bleed",
    damagePerTick: number
  ): void {
    const field = effectType === "burn" ? "burnEffect" : "bleedEffect";
    enemy[field] = createTimedDamageEffect({
      currentTime: this.run.timeElapsed,
      damagePerTick,
      duration: 2,
      tickInterval: 0.5
    });
    this.createBurst(enemy.x, enemy.y, effectType === "burn" ? 0xf7944d : 0xc43a3a, 2, 10, 120);
  }

  private fireBoneKnives(stats: DerivedWeaponStats): void {
    for (let index = 0; index < stats.projectileCount; index += 1) {
      const target = this.findNearestEnemy(stats.range);

      if (!target) {
        return;
      }

      this.fireKnifeAt(target, stats, index, stats.projectileCount);
    }
  }

  private findNearestEnemy(range: number): EnemySprite | null {
    let nearest: EnemySprite | null = null;
    let nearestDistanceSq = range * range;

    for (const child of this.enemies.getChildren()) {
      const enemy = child as EnemySprite;

      if (!enemy.active) {
        continue;
      }

      const distanceSq = Phaser.Math.Distance.Squared(this.player.x, this.player.y, enemy.x, enemy.y);

      if (distanceSq <= nearestDistanceSq) {
        nearest = enemy;
        nearestDistanceSq = distanceSq;
      }
    }

    return nearest;
  }

  private findRandomEnemy(range: number): EnemySprite | null {
    const candidates: EnemySprite[] = [];

    for (const child of this.enemies.getChildren()) {
      const enemy = child as EnemySprite;

      if (!enemy.active) {
        continue;
      }

      const distanceSq = Phaser.Math.Distance.Squared(this.player.x, this.player.y, enemy.x, enemy.y);

      if (distanceSq <= range * range) {
        candidates.push(enemy);
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    return candidates[Phaser.Math.Between(0, candidates.length - 1)];
  }

  private fireKnifeAt(target: EnemySprite, stats: DerivedWeaponStats, index: number, total: number): void {
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
    projectile.pierce = 0;
    projectile.isCrit = crit;
    projectile.damageTextColor = crit ? 0xf2d36b : 0xf3ead0;
    projectile.appliesBleed = false;
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
  }

  private tickHolyCandle(stats: DerivedWeaponStats): void {
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

  private ringGraveBell(stats: DerivedWeaponStats): void {
    getBellPulseSpecs({
      damage: stats.damage,
      pulseCount: stats.pulseCount,
      radius: stats.radius
    }).forEach((pulse) => {
      if (pulse.delayMs === 0) {
        this.applyBellPulse(pulse);
        return;
      }

      this.pendingBellPulses.push({
        fireAt: this.run.timeElapsed + pulse.delayMs / 1000,
        pulse
      });
    });
  }

  private applyBellPulse(pulse: BellPulseSpec): void {
    this.createDamageRadiusRing(this.player.x, this.player.y, 0xcdbb8d, pulse.radius);
    this.cameras.main.shake(pulse.index === 0 ? 80 : 110, pulse.index === 0 ? 0.003 : 0.004);

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

        if (enemy.active && distance > 0) {
          const knockback = (pulse.index === 0 ? 42 : 58) * (1 - enemy.def.knockbackResistance);
          enemy.x += ((enemy.x - this.player.x) / distance) * knockback;
          enemy.y += ((enemy.y - this.player.y) / distance) * knockback;
        }
      }
    }
  }

  private releaseCrowSwarm(stats: DerivedWeaponStats): void {
    for (let index = 0; index < stats.projectileCount; index += 1) {
      const target = this.findRandomEnemy(stats.range);

      if (!target) {
        return;
      }

      this.fireCrowAt(target, stats, index, stats.projectileCount);
    }
  }

  private fireCrowAt(target: EnemySprite, stats: DerivedWeaponStats, index: number, total: number): void {
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
    projectile.appliesBleed = stats.bleed;
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

        const hitDistance = enemy.def.radius + 8;
        const distanceSq = Phaser.Math.Distance.Squared(projectile.x, projectile.y, enemy.x, enemy.y);

        if (distanceSq <= hitDistance * hitDistance) {
          this.damageEnemy(enemy, projectile.damage, {
            important: projectile.isCrit || enemy.isElite,
            color: projectile.damageTextColor
          });
          if (enemy.active && projectile.appliesBleed) {
            this.applyTimedDamageEffect(enemy, "bleed", Math.max(1, Math.round(projectile.damage * 0.25)));
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
    return this.enemies.getChildren().map((child) => {
      const enemy = child as EnemySprite;

      return {
        id: enemy.runtimeId,
        active: enemy.active,
        distanceSq: Phaser.Math.Distance.Squared(x, y, enemy.x, enemy.y)
      };
    });
  }

  private findEnemyByRuntimeId(runtimeId: number): EnemySprite | null {
    for (const child of this.enemies.getChildren()) {
      const enemy = child as EnemySprite;

      if (enemy.active && enemy.runtimeId === runtimeId) {
        return enemy;
      }
    }

    return null;
  }

  private damageEnemy(enemy: EnemySprite, amount: number, feedback: DamageFeedbackOptions = {}): void {
    enemy.hp -= amount;
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
      roll: Math.random()
    });

    if (!shouldShow) {
      return;
    }

    this.showDamageNumber(enemy.x, enemy.y - enemy.def.radius - 8, amount, important, color);
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

      const minDistance = enemy.def.radius + other.def.radius + 6;
      const offsetX = enemy.x - other.x;
      const offsetY = enemy.y - other.y;
      const distanceSq = offsetX * offsetX + offsetY * offsetY;

      if (distanceSq <= 0 || distanceSq > minDistance * minDistance) {
        continue;
      }

      const distance = Math.sqrt(distanceSq);
      const force = 1 - distance / minDistance;
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
    for (let index = 0; index < count; index += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const travel = Phaser.Math.Between(Math.floor(distance * 0.45), distance);
      const particle = this.add.circle(x, y, Phaser.Math.Between(2, 4), color, 0.88).setDepth(16);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * travel,
        y: y + Math.sin(angle) * travel,
        alpha: 0,
        scale: 0.25,
        duration,
        ease: "Quad.easeOut",
        onComplete: () => particle.destroy()
      });
    }
  }

  private createRingBurst(x: number, y: number, color: number, radius: number): void {
    this.createRingEffect(x, y, color, getDecorativeRingVisual(radius));
  }

  private createDamageRadiusRing(x: number, y: number, color: number, radius: number): void {
    this.createRingEffect(x, y, color, getDamageRadiusRingVisual(radius));
  }

  private createRingEffect(x: number, y: number, color: number, visual: RingVisual): void {
    const ring = this.add.circle(x, y, visual.radius, color, 0).setStrokeStyle(2, color, 0.82).setDepth(14);
    ring.setScale(visual.startScale);

    this.tweens.add({
      targets: ring,
      alpha: 0,
      scale: visual.endScale,
      duration: visual.durationMs,
      ease: "Quad.easeOut",
      onComplete: () => ring.destroy()
    });
  }

  private showWorldText(x: number, y: number, text: string, color: string, fontSize: number): void {
    const label = this.add
      .text(x, y, text, {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: `${fontSize}px`,
        fontStyle: "700",
        color,
        stroke: "#15110d",
        strokeThickness: 4
      })
      .setOrigin(0.5)
      .setDepth(120);

    this.tweens.add({
      targets: label,
      y: y - 36,
      alpha: 0,
      duration: 1200,
      ease: "Quad.easeOut",
      onComplete: () => label.destroy()
    });
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
    this.createLevelUpFlash();
    this.status = "level_up";
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
    this.player.setVelocity(0, 0);
    this.player.setTint(0x8a1d1d);
    this.physics.pause();
    this.clearDamageNumbers();
    this.setLowHpWarningVisible(false);
    this.activeFinalBoss = null;
    this.layoutHud();
    this.finalizeRun(false);
    this.showGameOverOverlay();
  }

  private winRun(): void {
    this.status = "victory";
    this.player.setVelocity(0, 0);
    this.physics.pause();
    this.clearDamageNumbers();
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
    this.enemies.clear(true, true);
    this.projectiles.clear(true, true);
    this.pickups.clear(true, true);
    this.clearDamageNumbers();
    this.pendingBellPulses = [];
    this.activeFinalBoss = null;
  }

  private showMainMenu(): void {
    this.status = "menu";
    this.physics.pause();
    this.setHudVisible(false);
    this.clearDamageNumbers();
    this.clearOverlay();

    const { width, height } = this.scale;
    const titleSize = Phaser.Math.Clamp(Math.floor(width / 12.6), 32, 58);
    const subtitleWidth = Math.max(260, width - 80);
    this.addOverlayRectangle(width / 2, height / 2, width, height, 0x0a0d0b, 0.78);
    this.addOverlayText(width / 2, height / 2 - 135, "GRAVE HARVEST", titleSize, "#f2e7ce", "700")
      .setOrigin(0.5)
      .setWordWrapWidth(width - 36);
    this.addOverlayText(
      width / 2,
      height / 2 - 72,
      "Двигайся WASD или стрелками. Атаки автоматические. Собирай души, чтобы стать сильнее.",
      18,
      "#cfc3ad"
    )
      .setOrigin(0.5)
      .setWordWrapWidth(subtitleWidth);
    this.addOverlayText(
      width / 2,
      height / 2 - 24,
      `Кости: ${this.saveData.bones}   Лучшее: ${formatTimer(this.saveData.stats.bestTime)}   Победы: ${this.saveData.stats.wins}/${this.saveData.stats.totalRuns}`,
      18,
      "#e5d39f",
      "700"
    )
      .setOrigin(0.5)
      .setWordWrapWidth(subtitleWidth);
    this.addOverlayButton(width / 2, height / 2 + 26, 220, 52, "Начать ночь", () => this.startRun());
    this.addOverlayButton(width / 2, height / 2 + 90, 270, 48, "Постоянные улучшения", () => this.showMetaUpgradesOverlay());
    this.addOverlayButton(width / 2, height / 2 + 150, 210, 44, "Сбросить прогресс", () => this.showResetProgressConfirmOverlay());
    this.addOverlayText(width / 2, height / 2 + 202, "Enter тоже запускает забег", 15, "#8f9687").setOrigin(0.5);
  }

  private showPauseOverlay(): void {
    this.clearOverlay();
    const { width, height } = this.scale;
    this.addOverlayRectangle(width / 2, height / 2, width, height, 0x0b0e0c, 0.58);
    this.addOverlayText(width / 2, height / 2 - 96, "Пауза", 42, "#f4ead7", "700").setOrigin(0.5);
    this.addOverlayButton(width / 2, height / 2 - 24, 190, 48, "Продолжить", () => this.resumeRun());
    this.addOverlayButton(width / 2, height / 2 + 38, 190, 48, "Заново", () => this.startRun());
    this.addOverlayButton(width / 2, height / 2 + 100, 190, 48, "Главное меню", () => this.showMainMenu());
  }

  private showLevelUpOverlay(): void {
    this.clearOverlay();
    const { width, height } = this.scale;
    const compact = width < 760;
    this.addOverlayRectangle(width / 2, height / 2, width, height, 0x090b0a, 0.64);
    this.addOverlayText(width / 2, 72, "Выбери проклятие", width < 520 ? 30 : 40, "#f4ead7", "700")
      .setOrigin(0.5)
      .setWordWrapWidth(width - 40);

    const cardWidth = compact ? Math.min(width - 48, 360) : Math.min(300, (width - 120) / 3);
    const cardHeight = compact ? 150 : 210;
    const totalWidth = cardWidth * this.currentUpgradeOptions.length + 20 * (this.currentUpgradeOptions.length - 1);
    const startX = width / 2 - totalWidth / 2 + cardWidth / 2;
    const startY = compact ? 170 : height / 2 + 12;

    this.currentUpgradeOptions.forEach((upgrade, index) => {
      const x = compact ? width / 2 : startX + index * (cardWidth + 20);
      const y = compact ? startY + index * (cardHeight + 14) : startY;
      const rarityColor = getRarityColor(upgrade.rarity);
      const card = this.addOverlayRectangle(x, y, cardWidth, cardHeight, 0x1d211d, 0.97);
      card.setStrokeStyle(2, rarityColor, 1);
      card.setInteractive({ useHandCursor: true });
      card.on("pointerdown", () => this.pickUpgradeByIndex(index));

      this.addOverlayText(compact ? x - cardWidth / 2 + 28 : x, compact ? y - 48 : y - 74, `${index + 1}`, 22, "#151a16", "700")
        .setOrigin(0.5)
        .setBackgroundColor("#f1e3bd")
        .setPadding(9, 3, 9, 3);
      this.addOverlayText(compact ? x + 22 : x, compact ? y - 48 : y - 34, upgrade.name, compact ? 18 : 22, "#f4ead7", "700")
        .setOrigin(0.5)
        .setWordWrapWidth(compact ? cardWidth - 92 : cardWidth - 34);
      this.addOverlayText(x, compact ? y - 16 : y + 2, formatRarityLabel(upgrade.rarity), 14, colorToCss(rarityColor), "700").setOrigin(0.5);
      this.addOverlayText(x, compact ? y + 25 : y + 50, upgrade.description, compact ? 15 : 16, "#cfc4b0")
        .setOrigin(0.5)
        .setWordWrapWidth(cardWidth - 44);
      const stacks = this.run.upgrades.upgrades[upgrade.id] ?? 0;
      this.addOverlayText(x, compact ? y + 58 : y + 88, `${stacks}/${upgrade.maxStacks}`, 14, "#8d9587").setOrigin(0.5);
    });
  }

  private showGameOverOverlay(): void {
    this.clearOverlay();
    this.setHudVisible(false);
    const { width, height } = this.scale;
    const summary = this.runEndSummary ?? this.finalizeRun(false);
    const bonusBones = summary.survivalBonus + summary.victoryBonus;

    this.addOverlayRectangle(width / 2, height / 2, width, height, 0x090807, 0.76);
    this.addOverlayText(width / 2, height / 2 - 168, "Кладбище забрало своё", width < 520 ? 30 : 38, "#f4ead7", "700")
      .setOrigin(0.5)
      .setWordWrapWidth(width - 44);
    this.addOverlayText(
      width / 2,
      height / 2 - 100,
      `Выжил ${formatTimer(this.run.timeElapsed)}   Убийства ${this.run.kills}   Уровень ${this.run.level}`,
      22,
      "#d9cfba"
    )
      .setOrigin(0.5)
      .setWordWrapWidth(width - 48);
    this.addOverlayText(
      width / 2,
      height / 2 - 54,
      `Добыто ${summary.droppedBones}   Бонус ${bonusBones}   Сохранено ${summary.retainedBones}`,
      20,
      "#e5d39f"
    )
      .setOrigin(0.5)
      .setWordWrapWidth(width - 48);
    this.addOverlayText(width / 2, height / 2 - 14, `Баланс костей: ${this.saveData.bones}`, 20, "#f1dfaa", "700")
      .setOrigin(0.5)
      .setWordWrapWidth(width - 48);
    this.addOverlayButton(width / 2, height / 2 + 46, 250, 52, "Потратить кости", () => this.showMetaUpgradesOverlay());
    this.addOverlayButton(width / 2, height / 2 + 110, 210, 48, "Повторить", () => this.startRun());
    this.addOverlayButton(width / 2, height / 2 + 170, 210, 44, "Главное меню", () => this.showMainMenu());
  }

  private showVictoryOverlay(): void {
    this.clearOverlay();
    this.setHudVisible(false);
    const { width, height } = this.scale;
    const summary = this.runEndSummary ?? this.finalizeRun(true);
    const bonusBones = summary.survivalBonus + summary.victoryBonus;

    this.addOverlayRectangle(width / 2, height / 2, width, height, 0x090807, 0.74);
    this.addOverlayText(width / 2, height / 2 - 176, "Ночь пережита", width < 520 ? 34 : 44, "#f4ead7", "700")
      .setOrigin(0.5)
      .setWordWrapWidth(width - 44);
    this.addOverlayText(width / 2, height / 2 - 118, "Капитан мёртв.", 22, "#f1dfaa", "700")
      .setOrigin(0.5)
      .setWordWrapWidth(width - 48);
    this.addOverlayText(
      width / 2,
      height / 2 - 72,
      `Время ${formatTimer(this.run.timeElapsed)}   Убийства ${this.run.kills}   Уровень ${this.run.level}`,
      22,
      "#d9cfba"
    )
      .setOrigin(0.5)
      .setWordWrapWidth(width - 48);
    this.addOverlayText(
      width / 2,
      height / 2 - 28,
      `Добыто ${summary.droppedBones}   Бонус ${bonusBones}   Сохранено ${summary.retainedBones}`,
      20,
      "#e5d39f"
    )
      .setOrigin(0.5)
      .setWordWrapWidth(width - 48);
    this.addOverlayText(width / 2, height / 2 + 12, `Баланс костей: ${this.saveData.bones}`, 20, "#f1dfaa", "700")
      .setOrigin(0.5)
      .setWordWrapWidth(width - 48);
    this.addOverlayButton(width / 2, height / 2 + 72, 270, 52, "Постоянные улучшения", () => this.showMetaUpgradesOverlay());
    this.addOverlayButton(width / 2, height / 2 + 136, 210, 48, "Следующий забег", () => this.startRun());
    this.addOverlayButton(width / 2, height / 2 + 196, 210, 44, "Главное меню", () => this.showMainMenu());
  }

  private showMetaUpgradesOverlay(): void {
    this.status = "meta_upgrades";
    this.physics.pause();
    this.setHudVisible(false);
    this.clearDamageNumbers();
    this.clearOverlay();

    const { width, height } = this.scale;
    const panelWidth = Math.min(width - 48, 760);
    const cardWidth = Math.min(width - 64, 700);
    const cardHeight = width < 720 ? 86 : 74;
    const startY = width < 720 ? 150 : 154;

    this.addOverlayRectangle(width / 2, height / 2, width, height, 0x090807, 0.78);
    this.addOverlayText(width / 2, 58, "Постоянные улучшения", width < 520 ? 30 : 40, "#f4ead7", "700")
      .setOrigin(0.5)
      .setWordWrapWidth(width - 44);
    this.addOverlayText(width / 2, 104, `Кости: ${this.saveData.bones}`, 22, "#e5d39f", "700")
      .setOrigin(0.5)
      .setWordWrapWidth(panelWidth);

    META_UPGRADE_DEFINITIONS.forEach((definition, index) => {
      const level = this.saveData.meta[definition.id];
      const maxed = level >= definition.maxLevel;
      const cost = getMetaUpgradeCost(definition.id, level);
      const canBuy = canBuyMetaUpgrade(this.saveData, definition.id);
      const y = startY + index * (cardHeight + 10);
      const card = this.addOverlayRectangle(width / 2, y, cardWidth, cardHeight, 0x171c17, 0.97);
      card.setStrokeStyle(1, canBuy ? 0xc9b46a : 0x44503e, 0.9);

      const leftX = width / 2 - cardWidth / 2 + 20;
      const buttonX = width / 2 + cardWidth / 2 - 72;
      this.addOverlayText(leftX, y - 24, definition.name, 18, "#f4ead7", "700")
        .setOrigin(0, 0.5)
        .setWordWrapWidth(cardWidth - 170);
      this.addOverlayText(
        leftX,
        y,
        `${formatMetaLevelText(definition.id, level)}   ${definition.effectPerLevel}`,
        14,
        "#cfc4b0"
      )
        .setOrigin(0, 0.5)
        .setWordWrapWidth(cardWidth - 170);
      this.addOverlayText(leftX, y + 23, `Уровень ${level}/${definition.maxLevel}`, 14, "#8d9587")
        .setOrigin(0, 0.5);

      this.addOverlayButton(
        buttonX,
        y,
        122,
        38,
        maxed ? "Макс" : `${cost}`,
        () => this.buyMetaUpgrade(definition.id),
        canBuy
      );
    });

    this.addOverlayButton(width / 2 - 112, height - 54, 190, 46, "Начать ночь", () => this.startRun());
    this.addOverlayButton(width / 2 + 112, height - 54, 150, 46, "Назад", () => this.showMainMenu());
  }

  private buyMetaUpgrade(id: MetaUpgradeId): void {
    const result = purchaseMetaUpgrade(this.saveData, id);

    if (result.purchased) {
      this.saveData = result.save;
      this.persistSaveData();
    }

    this.showMetaUpgradesOverlay();
  }

  private showResetProgressConfirmOverlay(): void {
    this.status = "reset_confirm";
    this.physics.pause();
    this.setHudVisible(false);
    this.clearOverlay();

    const { width, height } = this.scale;
    this.addOverlayRectangle(width / 2, height / 2, width, height, 0x090807, 0.82);
    this.addOverlayText(width / 2, height / 2 - 94, "Сбросить прогресс?", width < 520 ? 28 : 36, "#f4ead7", "700")
      .setOrigin(0.5)
      .setWordWrapWidth(width - 44);
    this.addOverlayText(
      width / 2,
      height / 2 - 34,
      "Это удалит сохранённые кости, постоянные улучшения и статистику на этом устройстве.",
      18,
      "#d9cfba"
    )
      .setOrigin(0.5)
      .setWordWrapWidth(Math.min(width - 56, 560));
    this.addOverlayButton(width / 2 - 112, height / 2 + 58, 190, 48, "Да, сбросить", () => {
      this.resetSaveData();
      this.showMainMenu();
    });
    this.addOverlayButton(width / 2 + 112, height / 2 + 58, 150, 48, "Назад", () => this.showMainMenu());
  }

  private addOverlayButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onClick: () => void,
    enabled = true
  ): void {
    const rect = this.addOverlayRectangle(x, y, width, height, enabled ? 0xc9b46a : 0x4b4438, 1);
    rect.setStrokeStyle(2, enabled ? 0x4a3921 : 0x2c2d28, 1);

    if (enabled) {
      rect.setInteractive({ useHandCursor: true });
      rect.on("pointerover", () => rect.setFillStyle(0xe1cd7d, 1));
      rect.on("pointerout", () => rect.setFillStyle(0xc9b46a, 1));
      rect.on("pointerdown", onClick);
    }

    this.addOverlayText(x, y, label, 20, enabled ? "#17140f" : "#9a917e", "700").setOrigin(0.5);
  }

  private addOverlayRectangle(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
    alpha: number
  ): Phaser.GameObjects.Rectangle {
    const rect = this.add
      .rectangle(x, y, width, height, color, alpha)
      .setScrollFactor(0)
      .setDepth(2000);
    this.overlayObjects.push(rect);
    return rect;
  }

  private addOverlayText(
    x: number,
    y: number,
    text: string,
    fontSize: number,
    color: string,
    fontStyle = "400"
  ): Phaser.GameObjects.Text {
    const label = this.add
      .text(x, y, text, {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: `${fontSize}px`,
        fontStyle,
        color,
        align: "center"
      })
      .setScrollFactor(0)
      .setDepth(2001);
    this.overlayObjects.push(label);
    return label;
  }

  private clearOverlay(): void {
    this.overlayObjects.forEach((object) => object.destroy());
    this.overlayObjects = [];
  }

  private clearDamageNumbers(): void {
    this.damageNumberTexts.forEach((label) => {
      this.tweens.killTweensOf(label);
      label.destroy();
    });
    this.damageNumberTexts = [];
  }

  private setHudVisible(visible: boolean): void {
    this.hudObjects.forEach((object) => object.setVisible(visible));
    if (!visible) {
      this.setLowHpWarningVisible(false);
    }
  }

  private setLowHpWarningVisible(visible: boolean, alpha = 0): void {
    this.lowHpEdges.forEach((edge) => edge.setVisible(visible).setAlpha(alpha));
  }

  private layoutLowHpWarning(width: number, height: number, compact: boolean): void {
    const visible = this.status === "playing" && isLowHp(this.run.hp, this.run.upgrades.maxHp);

    if (!visible) {
      this.setLowHpWarningVisible(false);
      return;
    }

    const thickness = compact ? 24 : 32;
    const pulse = 0.2 + Math.sin(this.run.timeElapsed * 8.5) * 0.07;
    const [top, bottom, left, right] = this.lowHpEdges;
    top.setPosition(0, 0);
    top.width = width;
    top.height = thickness;
    bottom.setPosition(0, height - thickness);
    bottom.width = width;
    bottom.height = thickness;
    left.setPosition(0, 0);
    left.width = thickness;
    left.height = height;
    right.setPosition(width - thickness, 0);
    right.width = thickness;
    right.height = height;
    this.setLowHpWarningVisible(true, pulse);
  }

  private layoutHud(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const compact = width < 760;

    if (!this.run) {
      this.timerText.setPosition(width / 2, 20).setOrigin(0.5, 0);
      return;
    }

    const hpBarWidth = compact ? Math.min(220, width * 0.48) : 260;
    const hpX = compact ? 16 : 24;
    const hpY = compact ? 58 : 24;
    const hpRatio = Phaser.Math.Clamp(this.run.hp / this.run.upgrades.maxHp, 0, 1);
    const xpRatio = Phaser.Math.Clamp(this.run.xp / this.run.xpToNext, 0, 1);
    const hpBack = this.hudObjects[0] as Phaser.GameObjects.Rectangle;
    hpBack.setPosition(hpX, hpY);
    hpBack.width = hpBarWidth;
    this.hpFill.setPosition(hpX, hpY);
    this.hpFill.width = hpBarWidth * hpRatio;
    this.xpFill.setPosition(24, height - 28);
    this.xpFill.width = (width - 48) * xpRatio;

    this.xpBack.setPosition(24, height - 28);
    this.xpBack.width = width - 48;

    this.hpText.setText(`ОЗ ${Math.ceil(this.run.hp)} / ${this.run.upgrades.maxHp}`);
    this.hpText.setPosition(hpX, hpY + 22);
    this.levelText.setText(`Уровень ${this.run.level}`);
    this.levelText.setPosition(hpX, hpY + 46);
    this.timerText
      .setText(formatTimer(this.run.timeElapsed))
      .setFontSize(compact ? 30 : 34)
      .setPosition(width / 2, compact ? 10 : 18)
      .setOrigin(0.5, 0);
    this.bonesText
      .setText(`Кости ${this.run.bonesCollected}`)
      .setPosition(width - (compact ? 16 : 24), compact ? 58 : 24)
      .setOrigin(1, 0);
    this.killText
      .setText(`Убийства ${this.run.kills}`)
      .setPosition(width - (compact ? 16 : 24), compact ? 84 : 50)
      .setOrigin(1, 0);

    const activeWeapons = this.run.upgrades.weapons.slice(0, 4);
    const weaponPanelWidth = compact ? Math.min(276, width - 32) : 276;
    const weaponPanelHeight = 14 + activeWeapons.length * 28;
    const weaponY = height - 42 - weaponPanelHeight;
    const weaponX = compact ? 16 : 24;

    this.weaponPanel.setPosition(weaponX, weaponY);
    this.weaponPanel.width = weaponPanelWidth;
    this.weaponPanel.height = weaponPanelHeight;

    this.weaponIcons.forEach((icon, index) => {
      const weaponId = activeWeapons[index];
      const text = this.weaponTexts[index];

      if (!weaponId) {
        icon.setVisible(false);
        text.setVisible(false);
        return;
      }

      const stats = getDerivedWeaponStats(this.run.upgrades, weaponId);
      icon.setVisible(true);
      text.setVisible(true);
      icon.setTexture(getWeaponIconTexture(weaponId));
      icon.setPosition(weaponX + 22, weaponY + 22 + index * 28);
      text
        .setText(formatWeaponHudLine(weaponId, stats))
        .setPosition(weaponX + 44, weaponY + 13 + index * 28);
    });

    const bossVisible = Boolean(this.activeFinalBoss?.active);
    this.bossHpBack.setVisible(bossVisible);
    this.bossHpFill.setVisible(bossVisible);
    this.bossHpText.setVisible(bossVisible);

    if (this.activeFinalBoss?.active) {
      const bossBarWidth = compact ? Math.min(width - 48, 360) : 440;
      const bossRatio = Phaser.Math.Clamp(this.activeFinalBoss.hp / this.activeFinalBoss.maxHp, 0, 1);
      const bossY = compact ? 112 : 64;
      const bossX = width / 2 - bossBarWidth / 2;
      this.bossHpBack.setPosition(bossX, bossY);
      this.bossHpBack.width = bossBarWidth;
      this.bossHpFill.setPosition(bossX, bossY);
      this.bossHpFill.width = bossBarWidth * bossRatio;
      this.bossHpText
        .setText(`Капитан костяных рыцарей  ${Math.ceil(this.activeFinalBoss.hp)} / ${this.activeFinalBoss.maxHp}`)
        .setPosition(width / 2, bossY + 18)
        .setOrigin(0.5, 0);
    }

    this.layoutLowHpWarning(width, height, compact);
  }
}

function formatTimer(timeElapsed: number): string {
  const totalSeconds = Math.floor(timeElapsed);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function getRarityColor(rarity: UpgradeDefinition["rarity"]): number {
  if (rarity === "rare") {
    return 0xd89cff;
  }

  if (rarity === "uncommon") {
    return 0x7ed6ff;
  }

  return 0xd8d0bd;
}

function formatRarityLabel(rarity: UpgradeDefinition["rarity"]): string {
  if (rarity === "rare") {
    return "РЕДКОЕ";
  }

  if (rarity === "uncommon") {
    return "НЕОБЫЧНОЕ";
  }

  return "ОБЫЧНОЕ";
}

function colorToCss(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

function getWeaponIconTexture(weaponId: string): string {
  if (weaponId === "holy_candle") {
    return "weapon_holy_candle";
  }

  if (weaponId === "grave_bell") {
    return "weapon_grave_bell";
  }

  if (weaponId === "crow_swarm") {
    return "weapon_crow_swarm";
  }

  return "weapon_bone_knives";
}

function formatWeaponHudLine(weaponId: string, stats: DerivedWeaponStats): string {
  if (weaponId === "holy_candle") {
    return `Святая свеча  r${Math.round(stats.radius)}  ${stats.cooldown.toFixed(1)}с`;
  }

  if (weaponId === "grave_bell") {
    return `Могильный колокол  x${stats.pulseCount}  ${stats.cooldown.toFixed(1)}с`;
  }

  if (weaponId === "crow_swarm") {
    return `Стая ворон  x${stats.projectileCount}  ${stats.cooldown.toFixed(1)}с`;
  }

  return `Костяные ножи  x${stats.projectileCount}  ${stats.cooldown.toFixed(1)}с`;
}

function formatMetaLevelText(id: MetaUpgradeId, level: number): string {
  if (level <= 0) {
    return "Сейчас: нет";
  }

  if (id === "meta_hp") {
    return `Сейчас: +${level * 10} ОЗ`;
  }

  if (id === "meta_damage") {
    return `Сейчас: +${level * 5}% урона`;
  }

  if (id === "meta_pickup") {
    return `Сейчас: +${level * 10}% подбора`;
  }

  if (id === "meta_rare") {
    return `Сейчас: +${level}% редких карт`;
  }

  return `Сейчас: +${level * 5}% сохранения костей`;
}

function getEnemyTexture(enemyId: string): string {
  if (enemyId === "skeleton") {
    return "enemy_skeleton";
  }

  if (enemyId === "grave_rat") {
    return "enemy_grave_rat";
  }

  if (enemyId === "rot_walker") {
    return "enemy_rot_walker";
  }

  if (enemyId === "ghost") {
    return "enemy_ghost";
  }

  if (enemyId === "bone_knight") {
    return "enemy_bone_knight";
  }

  return "enemy";
}

function getEnemyDisplaySize(definition: EnemyDefinition): { width: number; height: number } {
  if (definition.id === "grave_rat") {
    return {
      width: definition.radius * 3,
      height: definition.radius * 1.8
    };
  }

  if (definition.id === "rot_walker") {
    return {
      width: definition.radius * 2.25,
      height: definition.radius * 2.55
    };
  }

  if (definition.id === "ghost") {
    return {
      width: definition.radius * 2.25,
      height: definition.radius * 2.65
    };
  }

  if (definition.id === "bone_knight") {
    return {
      width: definition.radius * 2.2,
      height: definition.radius * 2.55
    };
  }

  return {
    width: definition.radius * 2,
    height: definition.radius * 2.35
  };
}

function getDeathBurstColor(enemyId: string): number {
  if (enemyId === "grave_rat") {
    return 0x9b4635;
  }

  if (enemyId === "rot_walker") {
    return 0x6f8c5c;
  }

  if (enemyId === "ghost") {
    return 0x8fdfff;
  }

  return 0x8f2620;
}
