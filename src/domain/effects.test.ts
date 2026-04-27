import { describe, expect, it } from "vitest";
import {
  getDamageNumberVisual,
  getDamageRadiusRingVisual,
  getDecorativeRingVisual,
  isLowHp,
  shouldApplyScreenShake,
  shouldShowDamageNumber
} from "./effects";

describe("getDamageRadiusRingVisual", () => {
  it("ends exactly at the gameplay damage radius", () => {
    const visual = getDamageRadiusRingVisual(110);

    expect(visual.radius).toBe(110);
    expect(visual.startScale).toBeLessThan(visual.endScale);
    expect(visual.endScale).toBe(1);
    expect(visual.radius * visual.endScale).toBe(110);
  });
});

describe("getDecorativeRingVisual", () => {
  it("can expand past the source radius for juice-only effects", () => {
    const visual = getDecorativeRingVisual(110);

    expect(visual.endScale).toBeGreaterThan(1);
    expect(visual.radius * visual.endScale).toBeGreaterThan(110);
  });
});

describe("isLowHp", () => {
  it("turns on at 25% HP and below", () => {
    expect(isLowHp(25, 100)).toBe(true);
    expect(isLowHp(1, 100)).toBe(true);
    expect(isLowHp(26, 100)).toBe(false);
  });

  it("stays off when max HP is invalid", () => {
    expect(isLowHp(1, 0)).toBe(false);
  });
});

describe("shouldShowDamageNumber", () => {
  it("hides every damage number when the setting is disabled", () => {
    expect(
      shouldShowDamageNumber({
        activeCount: 0,
        activeEnemies: 1,
        important: true,
        roll: 0,
        enabled: false
      })
    ).toBe(false);
  });

  it("always shows important hits even past the normal cap", () => {
    expect(
      shouldShowDamageNumber({
        activeCount: 99,
        activeEnemies: 200,
        important: true,
        roll: 0.99
      })
    ).toBe(true);
  });

  it("hides normal hits once the active cap is reached", () => {
    expect(
      shouldShowDamageNumber({
        activeCount: 24,
        activeEnemies: 20,
        important: false,
        roll: 0
      })
    ).toBe(false);
  });

  it("samples normal hits when the crowd is dense", () => {
    expect(
      shouldShowDamageNumber({
        activeCount: 12,
        activeEnemies: 80,
        important: false,
        roll: 0.24
      })
    ).toBe(true);
    expect(
      shouldShowDamageNumber({
        activeCount: 12,
        activeEnemies: 80,
        important: false,
        roll: 0.25
      })
    ).toBe(false);
  });
});

describe("shouldApplyScreenShake", () => {
  it("follows the screen shake setting", () => {
    expect(shouldApplyScreenShake({ screenShake: true })).toBe(true);
    expect(shouldApplyScreenShake({ screenShake: false })).toBe(false);
  });
});

describe("getDamageNumberVisual", () => {
  it("uses a compact light style for regular hits", () => {
    const visual = getDamageNumberVisual({ amount: 10.4, important: false });

    expect(visual.text).toBe("10");
    expect(visual.color).toBe("#f3ead0");
    expect(visual.fontSize).toBeLessThan(16);
  });

  it("uses a larger golden style for important hits", () => {
    const regular = getDamageNumberVisual({ amount: 10, important: false });
    const important = getDamageNumberVisual({ amount: 10, important: true });

    expect(important.color).toBe("#f2d36b");
    expect(important.fontSize).toBeGreaterThan(regular.fontSize);
    expect(important.durationMs).toBeGreaterThan(regular.durationMs);
  });
});
