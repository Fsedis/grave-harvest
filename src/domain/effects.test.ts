import { describe, expect, it } from "vitest";
import { getDamageRadiusRingVisual, getDecorativeRingVisual } from "./effects";

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
