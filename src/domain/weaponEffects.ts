export type BellPulseInput = {
  damage: number;
  pulseCount: number;
  radius: number;
};

export type BellPulseSpec = {
  index: number;
  delayMs: number;
  damage: number;
  radius: number;
};

export type TimedDamageEffectInput = {
  currentTime: number;
  damagePerTick: number;
  duration: number;
  tickInterval: number;
};

export type TimedDamageEffect = {
  activeUntil: number;
  damagePerTick: number;
  nextTickAt: number;
  tickInterval: number;
};

export type TimedDamageTickResult = {
  active: boolean;
  effect: TimedDamageEffect;
  ticks: number;
};

const BELL_EXTRA_PULSE_DELAY_MS = 260;
const BELL_EXTRA_PULSE_DAMAGE_MULTIPLIER = 0.75;

export function getBellPulseSpecs(input: BellPulseInput): BellPulseSpec[] {
  const pulseCount = Math.max(1, Math.floor(input.pulseCount));

  return Array.from({ length: pulseCount }, (_, index) => ({
    index,
    delayMs: index * BELL_EXTRA_PULSE_DELAY_MS,
    damage: Math.max(
      1,
      Math.round(input.damage * (index === 0 ? 1 : BELL_EXTRA_PULSE_DAMAGE_MULTIPLIER))
    ),
    radius: input.radius
  }));
}

export function createTimedDamageEffect(input: TimedDamageEffectInput): TimedDamageEffect {
  return {
    activeUntil: input.currentTime + input.duration,
    damagePerTick: Math.max(1, Math.round(input.damagePerTick)),
    nextTickAt: input.currentTime + input.tickInterval,
    tickInterval: input.tickInterval
  };
}

export function consumeTimedDamageTicks(
  effect: TimedDamageEffect,
  currentTime: number
): TimedDamageTickResult {
  let ticks = 0;
  let nextTickAt = effect.nextTickAt;

  while (nextTickAt <= currentTime && nextTickAt <= effect.activeUntil) {
    ticks += 1;
    nextTickAt += effect.tickInterval;
  }

  const updatedEffect = {
    ...effect,
    nextTickAt
  };

  return {
    active: nextTickAt <= effect.activeUntil,
    effect: updatedEffect,
    ticks
  };
}
