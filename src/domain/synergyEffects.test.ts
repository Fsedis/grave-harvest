import { describe, expect, it } from "vitest";
import {
  getBellBurnTickDamage,
  getBleedingTargetKnifeDamage,
  getCrowBleedTickDamage,
  getCrowFlameBurstSpec,
  getKnifeBurnTickDamage,
  getKnifePierceBonus
} from "./synergyEffects";

describe("synergy effect formulas", () => {
  it("scales knife burn damage from the hit damage", () => {
    expect(getKnifeBurnTickDamage(10)).toBe(3);
    expect(getKnifeBurnTickDamage(2)).toBe(1);
  });

  it("gives knives a clear bonus against bleeding enemies", () => {
    expect(getBleedingTargetKnifeDamage(20)).toBe(27);
  });

  it("adds one pierce to bone knives", () => {
    expect(getKnifePierceBonus()).toBe(1);
  });

  it("scales bell burn from the pulse damage", () => {
    expect(getBellBurnTickDamage(18)).toBe(5);
  });

  it("uses crow damage for bleed and flame burst values", () => {
    expect(getCrowBleedTickDamage(12)).toBe(3);
    expect(getCrowFlameBurstSpec(12)).toEqual({
      damage: 5,
      burnTickDamage: 2,
      radius: 72
    });
  });
});
