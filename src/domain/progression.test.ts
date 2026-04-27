import { describe, expect, it } from "vitest";
import { calculateRetainedBones, xpRequired } from "./progression";

describe("xpRequired", () => {
  it("matches the PRD formula examples for early levels", () => {
    expect(xpRequired(1)).toBe(14);
    expect(xpRequired(2)).toBe(23);
    expect(xpRequired(3)).toBe(33);
    expect(xpRequired(5)).toBe(58);
  });

  it("keeps scaling into the middle of a ten minute run", () => {
    expect(xpRequired(10)).toBe(148);
    expect(xpRequired(15)).toBe(278);
    expect(xpRequired(20)).toBe(448);
  });
});

describe("calculateRetainedBones", () => {
  it("keeps all collected bones after victory", () => {
    expect(calculateRetainedBones({ collected: 73, timeElapsed: 600, won: true })).toBe(73);
  });

  it("uses the death retention brackets from the PRD", () => {
    expect(calculateRetainedBones({ collected: 25, timeElapsed: 120, won: false })).toBe(10);
    expect(calculateRetainedBones({ collected: 25, timeElapsed: 240, won: false })).toBe(15);
    expect(calculateRetainedBones({ collected: 100, timeElapsed: 480, won: false })).toBe(75);
  });

  it("adds meta retention without exceeding full retention", () => {
    expect(
      calculateRetainedBones({ collected: 25, timeElapsed: 240, won: false, retentionBonus: 0.05 })
    ).toBe(16);
    expect(
      calculateRetainedBones({ collected: 25, timeElapsed: 480, won: false, retentionBonus: 0.5 })
    ).toBe(25);
  });
});
