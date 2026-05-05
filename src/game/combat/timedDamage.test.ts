import { describe, expect, it } from "vitest";
import {
  applyTimedDamageToTarget,
  consumeTimedDamageForTarget,
  getTimedDamageColor,
  type TimedDamageTarget
} from "./timedDamage";

describe("timed damage combat helpers", () => {
  it("applies and consumes burn ticks on a target", () => {
    const target: TimedDamageTarget = {
      burnEffect: null,
      bleedEffect: null
    };

    applyTimedDamageToTarget(target, "burn", 10, 3);
    expect(target.burnEffect).not.toBeNull();
    expect(target.bleedEffect).toBeNull();

    const early = consumeTimedDamageForTarget(target, "burn", 10.25);
    expect(early).toEqual({ ticks: 0, damagePerTick: 3 });
    expect(target.burnEffect).not.toBeNull();

    const firstTick = consumeTimedDamageForTarget(target, "burn", 10.5);
    expect(firstTick).toEqual({ ticks: 1, damagePerTick: 3 });
    expect(target.burnEffect).not.toBeNull();
  });

  it("returns null when a target has no matching effect", () => {
    const target: TimedDamageTarget = {
      burnEffect: null,
      bleedEffect: null
    };

    expect(consumeTimedDamageForTarget(target, "bleed", 10)).toBeNull();
  });

  it("keeps current feedback colors for burn and bleed", () => {
    expect(getTimedDamageColor("burn")).toBe(0xf7944d);
    expect(getTimedDamageColor("bleed")).toBe(0xc43a3a);
  });
});
