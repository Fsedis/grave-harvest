import { describe, expect, it } from "vitest";
import {
  findNearestTarget,
  findRandomTarget,
  findTargetByRuntimeId,
  getHomingCandidatesFromTargets,
  type CombatTarget
} from "./targeting";

const targets: CombatTarget[] = [
  { runtimeId: 1, active: true, x: 10, y: 0 },
  { runtimeId: 2, active: false, x: 4, y: 0 },
  { runtimeId: 3, active: true, x: 6, y: 0 },
  { runtimeId: 4, active: true, x: 30, y: 0 }
];

describe("combat targeting helpers", () => {
  it("finds the nearest active target within range", () => {
    expect(findNearestTarget(targets, { x: 0, y: 0 }, 12)?.runtimeId).toBe(3);
    expect(findNearestTarget(targets, { x: 0, y: 0 }, 5)).toBeNull();
  });

  it("finds a random active target within range using the provided picker", () => {
    expect(findRandomTarget(targets, { x: 0, y: 0 }, 12, () => 0)?.runtimeId).toBe(1);
    expect(findRandomTarget(targets, { x: 0, y: 0 }, 12, () => 1)?.runtimeId).toBe(3);
    expect(findRandomTarget(targets, { x: 0, y: 0 }, 5, () => 0)).toBeNull();
  });

  it("finds active targets by runtime id", () => {
    expect(findTargetByRuntimeId(targets, 1)?.runtimeId).toBe(1);
    expect(findTargetByRuntimeId(targets, 2)).toBeNull();
    expect(findTargetByRuntimeId(targets, 99)).toBeNull();
  });

  it("formats homing candidates from active and inactive targets", () => {
    expect(getHomingCandidatesFromTargets(targets.slice(0, 2), { x: 0, y: 0 })).toEqual([
      { id: 1, active: true, distanceSq: 100 },
      { id: 2, active: false, distanceSq: 16 }
    ]);
  });
});
