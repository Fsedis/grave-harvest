import Phaser from "phaser";
import type { EnemyDefinition } from "../../data/enemies";
import type { PickupType } from "../../domain/pickups";
import type { TimedDamageEffect } from "../../domain/weaponEffects";

export type EnemySprite = Phaser.Physics.Arcade.Image & {
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

export type ProjectileSprite = Phaser.Physics.Arcade.Image & {
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

export type PickupSprite = Phaser.Physics.Arcade.Image & {
  pickupType: PickupType;
  value: number;
};

export type DamageFeedbackOptions = {
  important?: boolean;
  color?: number;
  showNumber?: boolean;
};
