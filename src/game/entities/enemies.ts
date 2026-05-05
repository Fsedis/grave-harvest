import Phaser from "phaser";
import type { EnemyDefinition } from "../../data/enemies";
import { getSeparationPadding, getSeparationWeight } from "../../domain/movement";
import type { ScriptedEnemySpawn } from "../../domain/spawnDirector";
import { getEnemyDisplaySize, getEnemyTexture } from "../formatters/enemies";
import type { EnemySprite } from "./types";

const ENEMY_SEPARATION_NEIGHBORS = 10;

export type EnemySpawnInput = {
  enemies: Phaser.Physics.Arcade.Group;
  player: Phaser.Physics.Arcade.Image;
  definition: EnemyDefinition;
  runtimeId: number;
  timeElapsed: number;
  mapSize: number;
  hardEnemyCap: number;
  scripted?: ScriptedEnemySpawn;
};

export function spawnEnemyInstance(input: EnemySpawnInput): EnemySprite | null {
  const { enemies, player, definition, scripted } = input;
  const { x, y } = getEnemySpawnPoint({
    player,
    mapSize: input.mapSize,
    scripted: Boolean(scripted)
  });

  if (scripted && enemies.countActive(true) >= input.hardEnemyCap) {
    freeEnemySlotForScriptedSpawn(enemies);
  }

  const enemy = enemies.get(x, y, getEnemyTexture(definition.id)) as EnemySprite | null;

  if (!enemy) {
    return null;
  }

  const scaleMultiplier = scripted?.scaleMultiplier ?? 1;
  const display = getEnemyDisplaySize(definition);
  enemy.runtimeId = input.runtimeId;
  enemy.burnEffect = null;
  enemy.bleedEffect = null;
  enemy.def = definition;
  enemy.hp = Math.round(definition.hp * (scripted?.hpMultiplier ?? 1));
  enemy.maxHp = enemy.hp;
  enemy.spawnedAt = input.timeElapsed;
  enemy.isElite = Boolean(scripted);
  enemy.eliteName = scripted?.name ?? "";
  enemy.nextDashAt = definition.behavior === "dash" ? input.timeElapsed + 1.4 : Number.POSITIVE_INFINITY;
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

export function freeEnemySlotForScriptedSpawn(enemies: Phaser.Physics.Arcade.Group): void {
  for (const child of enemies.getChildren()) {
    const enemy = child as EnemySprite;

    if (enemy.active && !enemy.isElite) {
      enemy.disableBody(true, true);
      return;
    }
  }
}

export function updateEnemyVisual(enemy: EnemySprite, timeElapsed: number): void {
  if (enemy.def.id === "ghost") {
    const phase = (timeElapsed - enemy.spawnedAt) * 4.2 + enemy.visualPulseSeed;
    enemy.setAlpha(0.58 + Math.sin(phase) * 0.16);
  }

  if (enemy.isElite) {
    const pulse = 1 + Math.sin(timeElapsed * 4 + enemy.visualPulseSeed) * 0.035;
    enemy.setDisplaySize(enemy.baseDisplayWidth * pulse, enemy.baseDisplayHeight * pulse);
  }
}

export function calculateEnemySeparation(
  enemies: Phaser.Physics.Arcade.Group,
  enemy: EnemySprite,
  neighborLimit = ENEMY_SEPARATION_NEIGHBORS
): Phaser.Math.Vector2 {
  const separation = new Phaser.Math.Vector2(0, 0);
  let neighbors = 0;

  for (const child of enemies.getChildren()) {
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

    if (neighbors >= neighborLimit) {
      break;
    }
  }

  return separation;
}

function getEnemySpawnPoint(input: {
  player: Phaser.Physics.Arcade.Image;
  mapSize: number;
  scripted: boolean;
}): Phaser.Math.Vector2 {
  const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
  const radius = input.scripted ? Phaser.Math.Between(560, 720) : Phaser.Math.Between(520, 860);
  const x = Phaser.Math.Clamp(input.player.x + Math.cos(angle) * radius, 40, input.mapSize - 40);
  const y = Phaser.Math.Clamp(input.player.y + Math.sin(angle) * radius, 40, input.mapSize - 40);

  return new Phaser.Math.Vector2(x, y);
}
