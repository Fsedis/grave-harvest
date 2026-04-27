import { describe, expect, it } from "vitest";
import {
  estimateEarlyGamePacing,
  getAllowedEnemies,
  getSpawnBudgetPerSecond,
  pickEnemyForBudget
} from "./spawnDirector";

describe("getSpawnBudgetPerSecond", () => {
  it("uses a denser vertical-slice budget curve for the first two minutes", () => {
    expect(getSpawnBudgetPerSecond(0)).toBe(1.8);
    expect(getSpawnBudgetPerSecond(30)).toBe(2.8);
    expect(getSpawnBudgetPerSecond(60)).toBe(4.2);
    expect(getSpawnBudgetPerSecond(90)).toBe(5.5);
    expect(getSpawnBudgetPerSecond(120)).toBe(7);
    expect(getSpawnBudgetPerSecond(540)).toBe(18);
    expect(getSpawnBudgetPerSecond(999)).toBe(18);
  });
});

describe("getAllowedEnemies", () => {
  it("unlocks the first three enemy types inside the vertical slice window", () => {
    expect(getAllowedEnemies(0).map((enemy) => enemy.id)).toEqual(["skeleton"]);
    expect(getAllowedEnemies(45).map((enemy) => enemy.id)).toEqual(["skeleton", "grave_rat"]);
    expect(getAllowedEnemies(90).map((enemy) => enemy.id)).toEqual([
      "skeleton",
      "grave_rat",
      "rot_walker"
    ]);
    expect(getAllowedEnemies(120).map((enemy) => enemy.id)).not.toContain("ghost");
    expect(getAllowedEnemies(150).map((enemy) => enemy.id)).toContain("ghost");
  });
});

describe("pickEnemyForBudget", () => {
  it("returns null when no allowed enemy fits the budget", () => {
    expect(pickEnemyForBudget(0.5, 240, () => 0)).toBeNull();
  });

  it("chooses an enemy that fits the current budget", () => {
    const enemy = pickEnemyForBudget(3, 120, () => 0.99);

    expect(enemy).not.toBeNull();
    expect(enemy?.spawnCost).toBeLessThanOrEqual(3);
  });
});

describe("estimateEarlyGamePacing", () => {
  it("targets at least one level-up by one minute", () => {
    expect(estimateEarlyGamePacing(60).levelUps).toBeGreaterThanOrEqual(1);
  });

  it("targets at least two level-ups by two minutes", () => {
    expect(estimateEarlyGamePacing(120).levelUps).toBeGreaterThanOrEqual(2);
  });
});
