import { describe, expect, it } from "vitest";
import { getAllowedEnemies, getSpawnBudgetPerSecond, pickEnemyForBudget } from "./spawnDirector";

describe("getSpawnBudgetPerSecond", () => {
  it("interpolates the PRD budget curve by elapsed time", () => {
    expect(getSpawnBudgetPerSecond(0)).toBe(1.5);
    expect(getSpawnBudgetPerSecond(60)).toBe(2.5);
    expect(getSpawnBudgetPerSecond(90)).toBe(3);
    expect(getSpawnBudgetPerSecond(540)).toBe(18);
    expect(getSpawnBudgetPerSecond(999)).toBe(18);
  });
});

describe("getAllowedEnemies", () => {
  it("unlocks enemy types by their first appearance time", () => {
    expect(getAllowedEnemies(0).map((enemy) => enemy.id)).toEqual(["skeleton"]);
    expect(getAllowedEnemies(120).map((enemy) => enemy.id)).toEqual([
      "skeleton",
      "grave_rat",
      "rot_walker"
    ]);
    expect(getAllowedEnemies(240).map((enemy) => enemy.id)).toContain("ghost");
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
