import Phaser from "phaser";
import { type EnemyDefinition } from "../data/enemies";
import { getWeaponDefinition } from "../data/weapons";
import { calculateRetainedBones, xpRequired } from "../domain/progression";
import { getSpawnBudgetPerSecond, pickEnemyForBudget } from "../domain/spawnDirector";
import {
  applyUpgrade,
  createInitialUpgradeState,
  selectUpgradeOptions,
  type UpgradeDefinition,
  type UpgradeState
} from "../domain/upgrades";

const MAP_SIZE = 2200;
const PLAYER_RADIUS = 16;
const SOFT_ENEMY_CAP = 180;
const HARD_ENEMY_CAP = 260;
const HARD_PROJECTILE_CAP = 300;
const HARD_PICKUP_CAP = 400;
const PLAYER_INVULNERABILITY_SECONDS = 0.35;
const ENEMY_SEPARATION_STRENGTH = 0.92;
const ENEMY_SEPARATION_NEIGHBORS = 8;

type RunStatus = "menu" | "playing" | "paused" | "level_up" | "game_over";

type EnemySprite = Phaser.Physics.Arcade.Image & {
  def: EnemyDefinition;
  hp: number;
  maxHp: number;
  spawnedAt: number;
};

type ProjectileSprite = Phaser.Physics.Arcade.Image & {
  damage: number;
  range: number;
  traveled: number;
  pierce: number;
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
  knifeCooldown: number;
  invulnerableUntil: number;
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
  private xpFill!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private bonesText!: Phaser.GameObjects.Text;
  private killText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private weaponPanel!: Phaser.GameObjects.Rectangle;
  private weaponIcon!: Phaser.GameObjects.Image;
  private weaponText!: Phaser.GameObjects.Text;

  constructor() {
    super("RunScene");
  }

  create(): void {
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
    this.updateEnemies(dt);
    this.updateBoneKnives(dt);
    this.updateProjectiles(dt);
    this.updatePickups(dt);
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
      if (this.status === "menu" || this.status === "game_over") {
        this.startRun();
      }
    });
    this.input.keyboard!.on("keydown-ESC", () => {
      if (this.status === "playing") {
        this.pauseRun();
      } else if (this.status === "paused") {
        this.resumeRun();
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
    const xpBack = this.add.rectangle(24, 0, 100, 12, 0x10222a, 0.95).setOrigin(0, 0);
    this.xpFill = this.add.rectangle(24, 0, 100, 12, 0x55bde0, 1).setOrigin(0, 0);
    this.weaponPanel = this.add.rectangle(24, 0, 224, 40, 0x111612, 0.88).setOrigin(0, 0);
    this.weaponPanel.setStrokeStyle(1, 0x47513f, 0.9);
    this.weaponIcon = this.add.image(0, 0, "weapon_bone_knives");
    this.weaponText = this.add.text(0, 0, "", { fontSize: "15px", color: "#efe3c8" });

    this.hudObjects = [
      hpBack,
      this.hpFill,
      this.hpText,
      this.levelText,
      this.timerText,
      this.bonesText,
      this.killText,
      xpBack,
      this.xpFill,
      this.weaponPanel,
      this.weaponIcon,
      this.weaponText
    ];

    this.hudObjects.forEach((object) => object.setScrollFactor(0).setDepth(1000));
    this.layoutHud();
    this.setHudVisible(false);
  }

  private startRun(): void {
    this.clearOverlay();
    this.clearEntities();
    const upgradeState = createInitialUpgradeState();

    this.run = {
      hp: upgradeState.maxHp,
      level: 1,
      xp: 0,
      xpToNext: xpRequired(1),
      timeElapsed: 0,
      kills: 0,
      bonesCollected: 0,
      spawnBudget: 0,
      knifeCooldown: 0.35,
      invulnerableUntil: 0,
      upgrades: upgradeState
    };

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
    const activeEnemies = this.enemies.countActive(true);

    if (activeEnemies >= HARD_ENEMY_CAP) {
      return;
    }

    const pressureMultiplier = activeEnemies > SOFT_ENEMY_CAP ? 0.5 : 1;
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
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const radius = Phaser.Math.Between(520, 860);
    const x = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * radius, 40, MAP_SIZE - 40);
    const y = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * radius, 40, MAP_SIZE - 40);
    const enemy = this.enemies.get(x, y, getEnemyTexture(definition.id)) as EnemySprite | null;

    if (!enemy) {
      return;
    }

    enemy.def = definition;
    enemy.hp = definition.hp;
    enemy.maxHp = definition.hp;
    enemy.spawnedAt = this.run.timeElapsed;
    enemy.setTexture(getEnemyTexture(definition.id));
    enemy.setActive(true);
    enemy.setVisible(true);
    enemy.enableBody(true, x, y, true, true);
    enemy.setSize(definition.radius * 1.6, definition.radius * 1.6);
    const display = getEnemyDisplaySize(definition);
    enemy.setDisplaySize(display.width, display.height);
    enemy.setTint(definition.color);
    enemy.setAlpha(definition.id === "ghost" ? 0.72 : 1);
    enemy.setDepth(15);
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

      if (enemy.def.behavior === "zigzag") {
        const wobble = Math.sin((this.run.timeElapsed - enemy.spawnedAt) * 5) * 0.75;
        direction.rotate(wobble);
      }

      const separation = this.calculateEnemySeparation(enemy);
      const movement = direction.add(separation.scale(ENEMY_SEPARATION_STRENGTH));

      if (movement.lengthSq() > 0) {
        movement.normalize();
      }

      enemy.setVelocity(movement.x * enemy.def.speed, movement.y * enemy.def.speed);

      if (distance < PLAYER_RADIUS + enemy.def.radius && this.run.timeElapsed >= this.run.invulnerableUntil) {
        this.damagePlayer(enemy.def.damage);
      }

      if (dt > 0 && distance < PLAYER_RADIUS + enemy.def.radius + 10) {
        enemy.x -= direction.x * 18 * dt;
        enemy.y -= direction.y * 18 * dt;
      }
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

  private updateBoneKnives(dt: number): void {
    this.run.knifeCooldown -= dt;

    if (this.run.knifeCooldown > 0) {
      return;
    }

    const weapon = getWeaponDefinition("bone_knives");
    const cooldownMultiplier = Math.max(
      0.25,
      1 / this.run.upgrades.attackSpeedMultiplier - this.run.upgrades.cooldownReduction
    );
    this.run.knifeCooldown = weapon.cooldown * cooldownMultiplier;

    const projectileCount = (weapon.projectileCount ?? 1) + this.run.upgrades.projectileBonus;

    for (let index = 0; index < projectileCount; index += 1) {
      const target = this.findNearestEnemy(weapon.range);

      if (!target) {
        return;
      }

      this.fireKnifeAt(target, index, projectileCount);
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

  private fireKnifeAt(target: EnemySprite, index: number, total: number): void {
    const weapon = getWeaponDefinition("bone_knives");
    const projectile = this.projectiles.get(this.player.x, this.player.y, "knife") as ProjectileSprite | null;

    if (!projectile) {
      return;
    }

    const aim = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
    const spread = total > 1 ? Phaser.Math.DegToRad((index - (total - 1) / 2) * 9) : 0;
    const angle = aim + spread;
    const speed = weapon.projectileSpeed ?? 420;
    const crit = Math.random() < this.run.upgrades.critChance;
    const critMultiplier = crit ? this.run.upgrades.critDamage : 1;

    projectile.damage = Math.round(weapon.baseDamage * this.run.upgrades.damageMultiplier * critMultiplier);
    projectile.range = weapon.range;
    projectile.traveled = 0;
    projectile.pierce = 0;
    projectile.setActive(true);
    projectile.setVisible(true);
    projectile.enableBody(true, this.player.x, this.player.y, true, true);
    projectile.setDepth(18);
    projectile.setRotation(angle);
    projectile.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  private updateProjectiles(dt: number): void {
    for (const child of this.projectiles.getChildren()) {
      const projectile = child as ProjectileSprite;

      if (!projectile.active) {
        continue;
      }

      const body = projectile.body as Phaser.Physics.Arcade.Body;
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
          this.damageEnemy(enemy, projectile.damage);
          projectile.disableBody(true, true);
          break;
        }
      }
    }
  }

  private damageEnemy(enemy: EnemySprite, amount: number): void {
    enemy.hp -= amount;
    enemy.setTintFill(0xfff4d8);
    if (Math.random() < 0.32) {
      this.createBurst(enemy.x, enemy.y, 0xffe7b8, 2, 12, 90);
    }
    this.time.delayedCall(55, () => {
      if (enemy.active) {
        enemy.setTint(enemy.def.color);
      }
    });

    if (enemy.hp <= 0) {
      this.killEnemy(enemy);
    }
  }

  private killEnemy(enemy: EnemySprite): void {
    const { x, y, def } = enemy;
    enemy.disableBody(true, true);
    this.run.kills += 1;
    this.spawnPickup("xp", x, y, def.xpDrop);

    if (Math.random() < def.bonesDropChance) {
      this.spawnPickup("bones", x + Phaser.Math.Between(-10, 10), y + Phaser.Math.Between(-10, 10), def.bonesMin);
    }

    this.createBurst(x, y, getDeathBurstColor(def.id), def.id === "rot_walker" ? 9 : 6, 34, 240);
    this.createRingBurst(x, y, getDeathBurstColor(def.id), def.radius + 8);
  }

  private spawnPickup(type: PickupSprite["pickupType"], x: number, y: number, value: number): void {
    if (this.pickups.countActive(true) >= HARD_PICKUP_CAP) {
      return;
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
    const ring = this.add.circle(x, y, radius, color, 0).setStrokeStyle(2, color, 0.82).setDepth(14);

    this.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 2.2,
      duration: 220,
      ease: "Quad.easeOut",
      onComplete: () => ring.destroy()
    });
  }

  private checkLevelUp(): void {
    if (this.run.xp < this.run.xpToNext || this.status !== "playing") {
      return;
    }

    this.run.xp -= this.run.xpToNext;
    this.run.level += 1;
    this.run.xpToNext = xpRequired(this.run.level);
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
    this.showGameOverOverlay();
  }

  private clearEntities(): void {
    this.enemies.clear(true, true);
    this.projectiles.clear(true, true);
    this.pickups.clear(true, true);
  }

  private showMainMenu(): void {
    this.status = "menu";
    this.physics.pause();
    this.setHudVisible(false);
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
      "Move with WASD or arrows. Attacks are automatic. Collect souls to grow stronger.",
      18,
      "#cfc3ad"
    )
      .setOrigin(0.5)
      .setWordWrapWidth(subtitleWidth);
    this.addOverlayButton(width / 2, height / 2 + 8, 220, 52, "Start Night", () => this.startRun());
    this.addOverlayText(width / 2, height / 2 + 84, "Enter also starts the run", 15, "#8f9687").setOrigin(0.5);
  }

  private showPauseOverlay(): void {
    this.clearOverlay();
    const { width, height } = this.scale;
    this.addOverlayRectangle(width / 2, height / 2, width, height, 0x0b0e0c, 0.58);
    this.addOverlayText(width / 2, height / 2 - 96, "Paused", 42, "#f4ead7", "700").setOrigin(0.5);
    this.addOverlayButton(width / 2, height / 2 - 24, 190, 48, "Resume", () => this.resumeRun());
    this.addOverlayButton(width / 2, height / 2 + 38, 190, 48, "Restart", () => this.startRun());
    this.addOverlayButton(width / 2, height / 2 + 100, 190, 48, "Main Menu", () => this.showMainMenu());
  }

  private showLevelUpOverlay(): void {
    this.clearOverlay();
    const { width, height } = this.scale;
    const compact = width < 760;
    this.addOverlayRectangle(width / 2, height / 2, width, height, 0x090b0a, 0.64);
    this.addOverlayText(width / 2, 72, "Choose Your Curse", width < 520 ? 30 : 40, "#f4ead7", "700")
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
      this.addOverlayText(x, compact ? y - 16 : y + 2, upgrade.rarity.toUpperCase(), 14, colorToCss(rarityColor), "700").setOrigin(0.5);
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
    const retainedBones = calculateRetainedBones({
      collected: this.run.bonesCollected,
      timeElapsed: this.run.timeElapsed,
      won: false
    });

    this.addOverlayRectangle(width / 2, height / 2, width, height, 0x090807, 0.76);
    this.addOverlayText(width / 2, height / 2 - 148, "The Grave Takes Its Due", width < 520 ? 30 : 38, "#f4ead7", "700")
      .setOrigin(0.5)
      .setWordWrapWidth(width - 44);
    this.addOverlayText(
      width / 2,
      height / 2 - 78,
      `Survival ${formatTimer(this.run.timeElapsed)}   Kills ${this.run.kills}   Level ${this.run.level}`,
      22,
      "#d9cfba"
    )
      .setOrigin(0.5)
      .setWordWrapWidth(width - 48);
    this.addOverlayText(
      width / 2,
      height / 2 - 34,
      `Bones collected ${this.run.bonesCollected}   Retained ${retainedBones}`,
      20,
      "#e5d39f"
    )
      .setOrigin(0.5)
      .setWordWrapWidth(width - 48);
    this.addOverlayButton(width / 2, height / 2 + 38, 210, 52, "Retry", () => this.startRun());
    this.addOverlayButton(width / 2, height / 2 + 102, 210, 48, "Main Menu", () => this.showMainMenu());
  }

  private addOverlayButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onClick: () => void
  ): void {
    const rect = this.addOverlayRectangle(x, y, width, height, 0xc9b46a, 1);
    rect.setStrokeStyle(2, 0x4a3921, 1);
    rect.setInteractive({ useHandCursor: true });
    rect.on("pointerover", () => rect.setFillStyle(0xe1cd7d, 1));
    rect.on("pointerout", () => rect.setFillStyle(0xc9b46a, 1));
    rect.on("pointerdown", onClick);
    this.addOverlayText(x, y, label, 20, "#17140f", "700").setOrigin(0.5);
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

  private setHudVisible(visible: boolean): void {
    this.hudObjects.forEach((object) => object.setVisible(visible));
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

    const xpBack = this.hudObjects[7] as Phaser.GameObjects.Rectangle;
    xpBack.setPosition(24, height - 28);
    xpBack.width = width - 48;

    this.hpText.setText(`HP ${Math.ceil(this.run.hp)} / ${this.run.upgrades.maxHp}`);
    this.hpText.setPosition(hpX, hpY + 22);
    this.levelText.setText(`Level ${this.run.level}`);
    this.levelText.setPosition(hpX, hpY + 46);
    this.timerText
      .setText(formatTimer(this.run.timeElapsed))
      .setFontSize(compact ? 30 : 34)
      .setPosition(width / 2, compact ? 10 : 18)
      .setOrigin(0.5, 0);
    this.bonesText
      .setText(`Bones ${this.run.bonesCollected}`)
      .setPosition(width - (compact ? 16 : 24), compact ? 58 : 24)
      .setOrigin(1, 0);
    this.killText
      .setText(`Kills ${this.run.kills}`)
      .setPosition(width - (compact ? 16 : 24), compact ? 84 : 50)
      .setOrigin(1, 0);

    const weaponPanelWidth = compact ? Math.min(224, width - 32) : 224;
    const weaponY = height - 82;
    const weapon = getWeaponDefinition("bone_knives");
    const projectileCount = (weapon.projectileCount ?? 1) + this.run.upgrades.projectileBonus;
    const cooldownMultiplier = Math.max(
      0.25,
      1 / this.run.upgrades.attackSpeedMultiplier - this.run.upgrades.cooldownReduction
    );
    const cooldown = weapon.cooldown * cooldownMultiplier;

    this.weaponPanel.setPosition(compact ? 16 : 24, weaponY);
    this.weaponPanel.width = weaponPanelWidth;
    this.weaponIcon.setPosition((compact ? 16 : 24) + 24, weaponY + 20);
    this.weaponText
      .setText(`Bone Knives  x${projectileCount}  ${cooldown.toFixed(1)}s`)
      .setPosition((compact ? 16 : 24) + 48, weaponY + 11);
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

function colorToCss(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
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
