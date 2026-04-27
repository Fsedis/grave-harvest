export type RingVisual = {
  radius: number;
  startScale: number;
  endScale: number;
  durationMs: number;
};

export const LOW_HP_RATIO = 0.25;
export const DAMAGE_NUMBER_CAP = 24;
export const DAMAGE_NUMBER_DENSE_ENEMY_COUNT = 80;
export const DAMAGE_NUMBER_DENSE_SAMPLE_CHANCE = 0.25;

export type DamageNumberVisibilityInput = {
  activeCount: number;
  activeEnemies: number;
  important: boolean;
  roll: number;
  enabled?: boolean;
};

export type DamageNumberVisualInput = {
  amount: number;
  important: boolean;
};

export type ScreenShakeSettings = {
  screenShake: boolean;
};

export type DamageNumberVisual = {
  text: string;
  color: string;
  fontSize: number;
  riseDistance: number;
  durationMs: number;
};

export function getDamageRadiusRingVisual(radius: number): RingVisual {
  return {
    radius,
    startScale: 0.35,
    endScale: 1,
    durationMs: 180
  };
}

export function getDecorativeRingVisual(radius: number): RingVisual {
  return {
    radius,
    startScale: 1,
    endScale: 2.2,
    durationMs: 220
  };
}

export function isLowHp(currentHp: number, maxHp: number): boolean {
  if (maxHp <= 0) {
    return false;
  }

  return currentHp / maxHp <= LOW_HP_RATIO;
}

export function shouldShowDamageNumber(input: DamageNumberVisibilityInput): boolean {
  if (input.enabled === false) {
    return false;
  }

  if (input.important) {
    return true;
  }

  if (input.activeCount >= DAMAGE_NUMBER_CAP) {
    return false;
  }

  if (input.activeEnemies >= DAMAGE_NUMBER_DENSE_ENEMY_COUNT) {
    return input.roll < DAMAGE_NUMBER_DENSE_SAMPLE_CHANCE;
  }

  return true;
}

export function shouldApplyScreenShake(settings: ScreenShakeSettings): boolean {
  return settings.screenShake;
}

export function getDamageNumberVisual(input: DamageNumberVisualInput): DamageNumberVisual {
  const amount = Math.max(1, Math.round(input.amount));

  if (input.important) {
    return {
      text: String(amount),
      color: "#f2d36b",
      fontSize: 18,
      riseDistance: 32,
      durationMs: 560
    };
  }

  return {
    text: String(amount),
    color: "#f3ead0",
    fontSize: 13,
    riseDistance: 24,
    durationMs: 440
  };
}
