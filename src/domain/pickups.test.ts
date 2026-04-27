import { describe, expect, it } from "vitest";
import { selectPickupMergeTarget, type PickupMergeCandidate } from "./pickups";

describe("selectPickupMergeTarget", () => {
  it("prefers the nearest pickup of the same type inside the local merge radius", () => {
    const candidates: PickupMergeCandidate[] = [
      { id: "far-xp", type: "xp", x: 260, y: 0, value: 1 },
      { id: "near-bones", type: "bones", x: 20, y: 0, value: 1 },
      { id: "near-xp", type: "xp", x: 90, y: 0, value: 1 }
    ];

    const target = selectPickupMergeTarget({
      type: "xp",
      x: 0,
      y: 0,
      candidates
    });

    expect(target?.id).toBe("near-xp");
  });

  it("falls back to the nearest same-type pickup on the map when none are local", () => {
    const candidates: PickupMergeCandidate[] = [
      { id: "wrong-type", type: "bones", x: 10, y: 0, value: 1 },
      { id: "farther-xp", type: "xp", x: 420, y: 0, value: 1 },
      { id: "fallback-xp", type: "xp", x: 260, y: 0, value: 1 }
    ];

    const target = selectPickupMergeTarget({
      type: "xp",
      x: 0,
      y: 0,
      candidates
    });

    expect(target?.id).toBe("fallback-xp");
  });

  it("returns null when there is no pickup of the same type to merge into", () => {
    const target = selectPickupMergeTarget({
      type: "bones",
      x: 0,
      y: 0,
      candidates: [{ id: "xp", type: "xp", x: 20, y: 0, value: 1 }]
    });

    expect(target).toBeNull();
  });
});
