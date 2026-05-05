import {
  consumeTimedDamageTicks,
  createTimedDamageEffect,
  type TimedDamageEffect
} from "../../domain/weaponEffects";

export type TimedDamageType = "burn" | "bleed";

export type TimedDamageTarget = {
  burnEffect: TimedDamageEffect | null;
  bleedEffect: TimedDamageEffect | null;
};

export type ConsumedTimedDamage = {
  ticks: number;
  damagePerTick: number;
};

export function consumeTimedDamageForTarget(
  target: TimedDamageTarget,
  effectType: TimedDamageType,
  currentTime: number
): ConsumedTimedDamage | null {
  const field = getTimedDamageField(effectType);
  const effect = target[field];

  if (!effect) {
    return null;
  }

  const result = consumeTimedDamageTicks(effect, currentTime);
  target[field] = result.active ? result.effect : null;

  return {
    ticks: result.ticks,
    damagePerTick: effect.damagePerTick
  };
}

export function applyTimedDamageToTarget(
  target: TimedDamageTarget,
  effectType: TimedDamageType,
  currentTime: number,
  damagePerTick: number
): void {
  const field = getTimedDamageField(effectType);
  target[field] = createTimedDamageEffect({
    currentTime,
    damagePerTick,
    duration: 2,
    tickInterval: 0.5
  });
}

export function getTimedDamageColor(effectType: TimedDamageType): number {
  return effectType === "burn" ? 0xf7944d : 0xc43a3a;
}

function getTimedDamageField(effectType: TimedDamageType): "burnEffect" | "bleedEffect" {
  return effectType === "burn" ? "burnEffect" : "bleedEffect";
}
