import Phaser from "phaser";
import type { AudioEvent } from "../../domain/audio";
import {
  getBellBurnTickDamage,
  getBleedingTargetKnifeDamage,
  getCrowBleedTickDamage,
  getKnifeBurnTickDamage,
  getKnifePierceBonus
} from "../../domain/synergyEffects";
import { getDerivedWeaponStats, type DerivedWeaponStats, type UpgradeState } from "../../domain/upgrades";
import { getBellPulseSpecs, type BellPulseSpec } from "../../domain/weaponEffects";
import type { EnemySprite, ProjectileSprite } from "../entities/types";
import { findNearestTarget, findRandomTarget } from "./targeting";
import type { ActiveSynergyFlags } from "./synergyFlags";
import type { TimedDamageType } from "./timedDamage";

export type WeaponAttackContext = {
  player: Phaser.Physics.Arcade.Image;
  enemies: Phaser.Physics.Arcade.Group;
  projectiles: Phaser.Physics.Arcade.Group;
  upgrades: UpgradeState;
  timeElapsed: number;
  hardProjectileCap: number;
  playSfx: (event: AudioEvent) => void;
  damageEnemy: (
    enemy: EnemySprite,
    amount: number,
    feedback?: { important?: boolean; color?: number; showNumber?: boolean }
  ) => void;
  applyTimedDamageEffect: (
    enemy: EnemySprite,
    effectType: TimedDamageType,
    damagePerTick: number
  ) => void;
  createBurst: (
    x: number,
    y: number,
    color: number,
    count: number,
    distance: number,
    duration: number
  ) => void;
  createDamageRadiusRing: (x: number, y: number, color: number, radius: number) => void;
  queueBellPulse: (fireAt: number, pulse: BellPulseSpec) => void;
  shakeCamera: (durationMs: number, intensity: number) => void;
};

export function fireBoneKnives(
  context: WeaponAttackContext,
  stats: DerivedWeaponStats,
  synergyFlags: ActiveSynergyFlags
): void {
  for (let index = 0; index < stats.projectileCount; index += 1) {
    const target = findNearestEnemy(context, stats.range);

    if (!target) {
      return;
    }

    fireKnifeAt(context, target, stats, index, stats.projectileCount, synergyFlags);
  }
}

export function tickHolyCandle(
  context: WeaponAttackContext,
  stats: DerivedWeaponStats
): void {
  context.createDamageRadiusRing(context.player.x, context.player.y, 0xf7d779, stats.radius);

  for (const child of context.enemies.getChildren()) {
    const enemy = child as EnemySprite;

    if (!enemy.active) {
      continue;
    }

    const distanceSq = Phaser.Math.Distance.Squared(context.player.x, context.player.y, enemy.x, enemy.y);

    if (distanceSq <= stats.radius * stats.radius) {
      context.damageEnemy(enemy, Math.max(1, Math.round(stats.damage)), {
        important: enemy.isElite,
        color: 0xf7d779
      });

      if (stats.burn && enemy.active) {
        context.applyTimedDamageEffect(enemy, "burn", Math.max(1, Math.round(stats.damage * 0.35)));
      }
    }
  }
}

export function ringGraveBell(
  context: WeaponAttackContext,
  stats: DerivedWeaponStats,
  synergyFlags: ActiveSynergyFlags
): void {
  getBellPulseSpecs({
    damage: stats.damage,
    pulseCount: stats.pulseCount,
    radius: stats.radius
  }).forEach((pulse) => {
    if (pulse.delayMs === 0) {
      applyBellPulse(context, pulse, synergyFlags);
      return;
    }

    context.queueBellPulse(context.timeElapsed + pulse.delayMs / 1000, pulse);
  });
}

export function applyBellPulse(
  context: WeaponAttackContext,
  pulse: BellPulseSpec,
  synergyFlags: ActiveSynergyFlags
): void {
  context.createDamageRadiusRing(context.player.x, context.player.y, 0xcdbb8d, pulse.radius);
  context.shakeCamera(pulse.index === 0 ? 80 : 110, pulse.index === 0 ? 0.003 : 0.004);
  context.playSfx("bell_pulse");

  for (const child of context.enemies.getChildren()) {
    const enemy = child as EnemySprite;

    if (!enemy.active) {
      continue;
    }

    const distance = Phaser.Math.Distance.Between(context.player.x, context.player.y, enemy.x, enemy.y);

    if (distance <= pulse.radius) {
      context.damageEnemy(enemy, pulse.damage, {
        important: enemy.isElite || pulse.index > 0,
        color: 0xcdbb8d
      });

      if (enemy.active && synergyFlags.bellCandleBurn) {
        context.applyTimedDamageEffect(enemy, "burn", getBellBurnTickDamage(pulse.damage));
      }

      if (enemy.active && distance > 0) {
        const knockback = (pulse.index === 0 ? 42 : 58) * (1 - enemy.def.knockbackResistance);
        enemy.x += ((enemy.x - context.player.x) / distance) * knockback;
        enemy.y += ((enemy.y - context.player.y) / distance) * knockback;
      }
    }
  }

  if (synergyFlags.bellBonusCrow) {
    releaseBonusCrowFromBell(context, synergyFlags);
  }
}

export function releaseCrowSwarm(
  context: WeaponAttackContext,
  stats: DerivedWeaponStats,
  synergyFlags: ActiveSynergyFlags
): void {
  for (let index = 0; index < stats.projectileCount; index += 1) {
    const target = findRandomEnemy(context, stats.range);

    if (!target) {
      return;
    }

    fireCrowAt(context, target, stats, index, stats.projectileCount, synergyFlags);
  }
}

function releaseBonusCrowFromBell(
  context: WeaponAttackContext,
  synergyFlags: ActiveSynergyFlags
): void {
  if (!context.upgrades.weapons.includes("crow_swarm")) {
    return;
  }

  const stats = getDerivedWeaponStats(context.upgrades, "crow_swarm");
  const target = findRandomEnemy(context, stats.range);

  if (!target) {
    return;
  }

  context.createBurst(context.player.x, context.player.y, 0x1f1b24, 4, 18, 140);
  fireCrowAt(context, target, stats, 0, 1, synergyFlags);
}

function findNearestEnemy(context: WeaponAttackContext, range: number): EnemySprite | null {
  return findNearestTarget(context.enemies.getChildren() as EnemySprite[], context.player, range);
}

function findRandomEnemy(context: WeaponAttackContext, range: number): EnemySprite | null {
  return findRandomTarget(context.enemies.getChildren() as EnemySprite[], context.player, range, (max) =>
    Phaser.Math.Between(0, max)
  );
}

function fireKnifeAt(
  context: WeaponAttackContext,
  target: EnemySprite,
  stats: DerivedWeaponStats,
  index: number,
  total: number,
  synergyFlags: ActiveSynergyFlags
): void {
  if (context.projectiles.countActive(true) >= context.hardProjectileCap) {
    return;
  }

  const projectile = context.projectiles.get(context.player.x, context.player.y, "knife") as ProjectileSprite | null;

  if (!projectile) {
    return;
  }

  const aim = Phaser.Math.Angle.Between(context.player.x, context.player.y, target.x, target.y);
  const spread = total > 1 ? Phaser.Math.DegToRad((index - (total - 1) / 2) * 9) : 0;
  const angle = aim + spread;
  const speed = stats.projectileSpeed ?? 420;
  const crit = Math.random() < context.upgrades.critChance;
  const critMultiplier = crit ? context.upgrades.critDamage : 1;

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
  projectile.enableBody(true, context.player.x, context.player.y, true, true);
  projectile.setDepth(18);
  projectile.setRotation(angle);
  projectile.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  context.playSfx("knife_shot");
}

function fireCrowAt(
  context: WeaponAttackContext,
  target: EnemySprite,
  stats: DerivedWeaponStats,
  index: number,
  total: number,
  synergyFlags: ActiveSynergyFlags
): void {
  if (context.projectiles.countActive(true) >= context.hardProjectileCap) {
    return;
  }

  const projectile = context.projectiles.get(context.player.x, context.player.y, "crow") as ProjectileSprite | null;

  if (!projectile) {
    return;
  }

  const aim = Phaser.Math.Angle.Between(context.player.x, context.player.y, target.x, target.y);
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
  projectile.enableBody(true, context.player.x, context.player.y, true, true);
  projectile.setDepth(19);
  projectile.setRotation(angle);
  projectile.setVelocity(Math.cos(angle) * projectile.homingSpeed, Math.sin(angle) * projectile.homingSpeed);
  context.playSfx("crow_attack");
}

export function getProjectileBleedDamage(hitDamage: number): number {
  return getCrowBleedTickDamage(hitDamage);
}

export function getProjectileBurnDamage(hitDamage: number): number {
  return getKnifeBurnTickDamage(hitDamage);
}

export function getProjectileBleedingTargetDamage(hitDamage: number): number {
  return getBleedingTargetKnifeDamage(hitDamage);
}
