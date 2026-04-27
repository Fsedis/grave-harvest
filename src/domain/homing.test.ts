import { describe, expect, it } from "vitest";
import { selectHomingTarget } from "./homing";

describe("selectHomingTarget", () => {
  it("keeps the current target while it is alive and in range", () => {
    const targetId = selectHomingTarget(2, 120, [
      { id: 1, active: true, distanceSq: 30 * 30 },
      { id: 2, active: true, distanceSq: 90 * 90 }
    ]);

    expect(targetId).toBe(2);
  });

  it("retargets to the nearest active enemy when the current target is dead", () => {
    const targetId = selectHomingTarget(2, 120, [
      { id: 1, active: true, distanceSq: 70 * 70 },
      { id: 2, active: false, distanceSq: 20 * 20 },
      { id: 3, active: true, distanceSq: 40 * 40 }
    ]);

    expect(targetId).toBe(3);
  });

  it("returns null when no active enemy is inside the search radius", () => {
    const targetId = selectHomingTarget(null, 120, [
      { id: 1, active: true, distanceSq: 130 * 130 },
      { id: 2, active: false, distanceSq: 20 * 20 }
    ]);

    expect(targetId).toBeNull();
  });
});
