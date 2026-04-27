import { describe, expect, it } from "vitest";
import {
  consumeTimedDamageTicks,
  createTimedDamageEffect,
  getBellPulseSpecs
} from "./weaponEffects";

describe("getBellPulseSpecs", () => {
  it("keeps the upgraded second bell pulse as a real delayed hit", () => {
    const pulses = getBellPulseSpecs({ damage: 18, pulseCount: 2, radius: 180 });

    expect(pulses).toEqual([
      { index: 0, delayMs: 0, damage: 18, radius: 180 },
      { index: 1, delayMs: 260, damage: 14, radius: 180 }
    ]);
  });

  it("creates one extra delayed pulse per extra pulse upgrade", () => {
    const pulses = getBellPulseSpecs({ damage: 20, pulseCount: 3, radius: 200 });

    expect(pulses.map((pulse) => pulse.delayMs)).toEqual([0, 260, 520]);
    expect(pulses.map((pulse) => pulse.damage)).toEqual([20, 15, 15]);
  });
});

describe("timed damage effects", () => {
  it("ticks burn and bleed damage over time instead of only once", () => {
    const effect = createTimedDamageEffect({
      currentTime: 10,
      damagePerTick: 3,
      duration: 2,
      tickInterval: 0.5
    });

    const result = consumeTimedDamageTicks(effect, 11.1);

    expect(result.ticks).toBe(2);
    expect(result.effect.nextTickAt).toBeCloseTo(11.5);
    expect(result.active).toBe(true);
  });

  it("expires after the final due tick is consumed", () => {
    const effect = createTimedDamageEffect({
      currentTime: 10,
      damagePerTick: 3,
      duration: 1,
      tickInterval: 0.5
    });

    const result = consumeTimedDamageTicks(effect, 11.2);

    expect(result.ticks).toBe(2);
    expect(result.active).toBe(false);
  });
});
