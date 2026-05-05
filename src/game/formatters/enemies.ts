import type { EnemyDefinition } from "../../data/enemies";

type EnemyDisplayDefinition = Pick<EnemyDefinition, "id" | "radius">;

export function getEnemyTexture(enemyId: string): string {
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

export function getEnemyDisplaySize(definition: EnemyDisplayDefinition): { width: number; height: number } {
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

export function getDeathBurstColor(enemyId: string): number {
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
