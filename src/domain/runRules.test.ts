import { describe, expect, it } from "vitest";
import { hasWonNight } from "./runRules";

describe("hasWonNight", () => {
  it("does not grant victory at 10:00 while the final boss is alive", () => {
    expect(hasWonNight({ timeElapsed: 600, finalBossKilled: false })).toBe(false);
  });

  it("grants victory only after the final boss is killed after 10:00", () => {
    expect(hasWonNight({ timeElapsed: 599.9, finalBossKilled: true })).toBe(false);
    expect(hasWonNight({ timeElapsed: 600, finalBossKilled: true })).toBe(true);
  });
});
