import Phaser from "phaser";
import { selectHomingTarget } from "../../domain/homing";
import { getCrowFlameBurstSpec } from "../../domain/synergyEffects";
import type { EnemySprite, ProjectileSprite } from "../entities/types";
import {
  findTargetByRuntimeId,
  getHomingCandidatesFromTargets
} from "./targeting";
import type { TimedDamageType } from "./timedDamage";
import {
  getProjectileBleedDamage,
  getProjectileBleedingTargetDamage,
  getProjectileBurnDamage
} from "./weaponAttacks";

export type ProjectileUpdateContext = {
  enemies: Phaser.Physics.Arcade.Group;
  projectiles: Phaser.Physics.Arcade.Group;
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
};

export function updateProjectiles(context: ProjectileUpdateContext, dt: number): void {
  for (const child of context.projectiles.getChildren()) {
    const projectile = child as ProjectileSprite;

    if (!projectile.active) {
      continue;
    }

    const body = projectile.body as Phaser.Physics.Arcade.Body;

    if (projectile.kind === "crow") {
      updateCrowProjectile(context, projectile);

      if (!projectile.active) {
        continue;
      }
    }

    projectile.traveled += body.velocity.length() * dt;

    if (projectile.traveled >= projectile.range) {
      projectile.disableBody(true, true);
      continue;
    }

    for (const enemyChild of context.enemies.getChildren()) {
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
            ? getProjectileBleedingTargetDamage(projectile.damage)
            : projectile.damage;

        context.damageEnemy(enemy, hitDamage, {
          important: projectile.isCrit || enemy.isElite,
          color: projectile.damageTextColor
        });
        if (enemy.active && projectile.appliesBurn) {
          context.applyTimedDamageEffect(enemy, "burn", getProjectileBurnDamage(hitDamage));
        }
        if (enemy.active && projectile.appliesBleed) {
          context.applyTimedDamageEffect(enemy, "bleed", getProjectileBleedDamage(hitDamage));
        }
        if (projectile.createsFlameBurst) {
          createCrowFlameBurst(context, hitX, hitY, hitDamage);
        }
        if (projectile.pierce > 0) {
          projectile.pierce -= 1;
          projectile.damage = Math.max(1, Math.round(projectile.damage * 0.5));
          context.createBurst(projectile.x, projectile.y, 0x9aa8bd, 3, 14, 120);
        } else {
          projectile.disableBody(true, true);
        }
        break;
      }
    }
  }
}

function createCrowFlameBurst(
  context: ProjectileUpdateContext,
  x: number,
  y: number,
  hitDamage: number
): void {
  const burst = getCrowFlameBurstSpec(hitDamage);
  context.createDamageRadiusRing(x, y, 0xf7944d, burst.radius);
  context.createBurst(x, y, 0xf7944d, 6, 28, 180);

  for (const child of context.enemies.getChildren()) {
    const enemy = child as EnemySprite;

    if (!enemy.active) {
      continue;
    }

    const distanceSq = Phaser.Math.Distance.Squared(x, y, enemy.x, enemy.y);

    if (distanceSq <= burst.radius * burst.radius) {
      context.damageEnemy(enemy, burst.damage, {
        important: enemy.isElite,
        color: 0xf7944d
      });

      if (enemy.active) {
        context.applyTimedDamageEffect(enemy, "burn", burst.burnTickDamage);
      }
    }
  }
}

function updateCrowProjectile(context: ProjectileUpdateContext, projectile: ProjectileSprite): void {
  const targetId = selectHomingTarget(
    projectile.targetEnemyId,
    projectile.homingRange,
    getHomingCandidatesFromTargets(context.enemies.getChildren() as EnemySprite[], {
      x: projectile.x,
      y: projectile.y
    })
  );
  projectile.targetEnemyId = targetId;

  if (targetId === null) {
    projectile.disableBody(true, true);
    return;
  }

  const target = findTargetByRuntimeId(context.enemies.getChildren() as EnemySprite[], targetId);

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
