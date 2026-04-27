import { describe, expect, it } from "vitest";
import {
  getContactKnockback,
  getInputDirection,
  getSeparationPadding,
  getSeparationWeight,
  stepVelocityTowardTarget
} from "./movement";

describe("getInputDirection", () => {
  it("normalizes diagonal input to length 1", () => {
    const direction = getInputDirection({
      left: false,
      right: true,
      up: true,
      down: false
    });

    expect(direction.x).toBeCloseTo(Math.SQRT1_2);
    expect(direction.y).toBeCloseTo(-Math.SQRT1_2);
    expect(Math.hypot(direction.x, direction.y)).toBeCloseTo(1);
  });

  it("returns zero direction for cancelled input", () => {
    expect(
      getInputDirection({
        left: true,
        right: true,
        up: false,
        down: false
      })
    ).toEqual({ x: 0, y: 0 });
  });
});

describe("stepVelocityTowardTarget", () => {
  it("accelerates toward target velocity instead of snapping instantly", () => {
    const velocity = stepVelocityTowardTarget({
      current: { x: 0, y: 0 },
      target: { x: 180, y: 0 },
      acceleration: 1550,
      deceleration: 2200,
      dt: 0.05
    });

    expect(velocity.x).toBeCloseTo(77.5);
    expect(velocity.y).toBe(0);
  });

  it("decelerates faster when there is no target input", () => {
    const velocity = stepVelocityTowardTarget({
      current: { x: 180, y: 0 },
      target: { x: 0, y: 0 },
      acceleration: 1550,
      deceleration: 2200,
      dt: 0.05
    });

    expect(velocity.x).toBeCloseTo(70);
    expect(velocity.y).toBe(0);
  });
});

describe("getContactKnockback", () => {
  it("pushes the player away from the enemy", () => {
    const knockback = getContactKnockback({
      player: { x: 20, y: 10 },
      enemy: { x: 10, y: 10 },
      speed: 260
    });

    expect(knockback.x).toBeCloseTo(260);
    expect(knockback.y).toBeCloseTo(0);
  });

  it("uses a stable fallback when positions overlap exactly", () => {
    const knockback = getContactKnockback({
      player: { x: 10, y: 10 },
      enemy: { x: 10, y: 10 },
      speed: 260
    });

    expect(knockback).toEqual({ x: 260, y: 0 });
  });
});

describe("enemy separation tuning", () => {
  it("lets rats slip more and makes large enemies claim more space", () => {
    expect(getSeparationPadding("grave_rat")).toBeLessThan(getSeparationPadding("skeleton"));
    expect(getSeparationPadding("rot_walker")).toBeGreaterThan(getSeparationPadding("skeleton"));
    expect(getSeparationPadding("bone_knight")).toBeGreaterThan(getSeparationPadding("rot_walker"));

    expect(getSeparationWeight("grave_rat")).toBeLessThan(getSeparationWeight("skeleton"));
    expect(getSeparationWeight("rot_walker")).toBeGreaterThan(getSeparationWeight("skeleton"));
    expect(getSeparationWeight("bone_knight")).toBeGreaterThan(getSeparationWeight("rot_walker"));
  });
});
