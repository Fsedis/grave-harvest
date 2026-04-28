const KNIFE_BURN_TICK_DAMAGE_MULTIPLIER = 0.3;
const KNIFE_BLEEDING_TARGET_DAMAGE_MULTIPLIER = 1.35;
const BELL_BURN_TICK_DAMAGE_MULTIPLIER = 0.25;
const CROW_BLEED_TICK_DAMAGE_MULTIPLIER = 0.25;
const CROW_FLAME_BURST_DAMAGE_MULTIPLIER = 0.45;
const CROW_FLAME_BURN_TICK_DAMAGE_MULTIPLIER = 0.18;
const CROW_FLAME_BURST_RADIUS = 72;
const KNIFE_PIERCE_BONUS = 1;

export type CrowFlameBurstSpec = {
  damage: number;
  burnTickDamage: number;
  radius: number;
};

export function getKnifeBurnTickDamage(hitDamage: number): number {
  return scaleDamage(hitDamage, KNIFE_BURN_TICK_DAMAGE_MULTIPLIER);
}

export function getBleedingTargetKnifeDamage(hitDamage: number): number {
  return scaleDamage(hitDamage, KNIFE_BLEEDING_TARGET_DAMAGE_MULTIPLIER);
}

export function getKnifePierceBonus(): number {
  return KNIFE_PIERCE_BONUS;
}

export function getBellBurnTickDamage(pulseDamage: number): number {
  return scaleDamage(pulseDamage, BELL_BURN_TICK_DAMAGE_MULTIPLIER);
}

export function getCrowBleedTickDamage(hitDamage: number): number {
  return scaleDamage(hitDamage, CROW_BLEED_TICK_DAMAGE_MULTIPLIER);
}

export function getCrowFlameBurstSpec(hitDamage: number): CrowFlameBurstSpec {
  return {
    damage: scaleDamage(hitDamage, CROW_FLAME_BURST_DAMAGE_MULTIPLIER),
    burnTickDamage: scaleDamage(hitDamage, CROW_FLAME_BURN_TICK_DAMAGE_MULTIPLIER),
    radius: CROW_FLAME_BURST_RADIUS
  };
}

function scaleDamage(damage: number, multiplier: number): number {
  return Math.max(1, Math.round(damage * multiplier));
}
