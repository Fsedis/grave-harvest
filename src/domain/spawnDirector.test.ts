import { describe, expect, it } from "vitest";
import { isWithinBalanceRange, MVP_BALANCE_TARGETS } from "./balance";
import {
  estimateEarlyGamePacing,
  estimateNightPacing,
  getAllowedEnemies,
  getScriptedEnemySpawns,
  getSpawnBudgetPerSecond,
  getSpawnPressureMultiplier,
  pickEnemyForBudget
} from "./spawnDirector";

describe("getSpawnBudgetPerSecond", () => {
  it("uses a denser vertical-slice budget curve for the first two minutes", () => {
    expect(getSpawnBudgetPerSecond(0)).toBe(1.8);
    expect(getSpawnBudgetPerSecond(30)).toBe(2.8);
    expect(getSpawnBudgetPerSecond(60)).toBe(4.2);
    expect(getSpawnBudgetPerSecond(90)).toBe(5.5);
    expect(getSpawnBudgetPerSecond(120)).toBe(7);
    expect(getSpawnBudgetPerSecond(540)).toBe(19);
    expect(getSpawnBudgetPerSecond(999)).toBe(20);
  });

  it("defines the full-night pressure checkpoints up to the captain", () => {
    expect(getSpawnBudgetPerSecond(0)).toBe(1.8);
    expect(getSpawnBudgetPerSecond(60)).toBe(4.2);
    expect(getSpawnBudgetPerSecond(120)).toBe(7);
    expect(getSpawnBudgetPerSecond(300)).toBe(12);
    expect(getSpawnBudgetPerSecond(480)).toBe(17);
    expect(getSpawnBudgetPerSecond(540)).toBe(19);
    expect(getSpawnBudgetPerSecond(600)).toBe(20);
  });
});

describe("getSpawnPressureMultiplier", () => {
  it("keeps pressure normal below soft cap, halves it above soft cap, and stops at hard cap", () => {
    expect(getSpawnPressureMultiplier(179)).toBe(1);
    expect(getSpawnPressureMultiplier(180)).toBe(1);
    expect(getSpawnPressureMultiplier(181)).toBe(0.5);
    expect(getSpawnPressureMultiplier(260)).toBe(0);
    expect(getSpawnPressureMultiplier(300)).toBe(0);
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
  });

  it("adds Ghost at the four minute mark and keeps Bone Knight scripted-only", () => {
    expect(getAllowedEnemies(239).map((enemy) => enemy.id)).not.toContain("ghost");
    expect(getAllowedEnemies(240).map((enemy) => enemy.id)).toContain("ghost");
    expect(getAllowedEnemies(600).map((enemy) => enemy.id)).not.toContain("bone_knight");
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

describe("estimateNightPacing", () => {
  it("keeps intermediate checkpoints in rising pressure order", () => {
    const fiveMinutes = estimateNightPacing(300);
    const eightMinutes = estimateNightPacing(480);
    const fullNight = estimateNightPacing(600);

    expect(fiveMinutes.pressureTier).toBe("dense");
    expect(eightMinutes.pressureTier).toBe("panic");
    expect(fullNight.pressureTier).toBe("final");
    expect(fiveMinutes.generatedBudget).toBeLessThan(eightMinutes.generatedBudget);
    expect(eightMinutes.generatedBudget).toBeLessThan(fullNight.generatedBudget);
  });

  it("estimates a full 10-minute night as final pressure with MVP-scale activity", () => {
    const estimate = estimateNightPacing(600);

    expect(estimate.generatedBudget).toBeGreaterThan(7000);
    expect(isWithinBalanceRange(estimate.estimatedKills.min, MVP_BALANCE_TARGETS.fullRunKills)).toBe(true);
    expect(isWithinBalanceRange(estimate.estimatedKills.max, MVP_BALANCE_TARGETS.fullRunKills)).toBe(true);
    expect(estimate.estimatedCollectableXp).toBeGreaterThan(5200);
    expect(isWithinBalanceRange(estimate.estimatedLevel, MVP_BALANCE_TARGETS.fullRunLevel)).toBe(true);
    expect(estimate.pressureTier).toBe("final");
  });
});

describe("getScriptedEnemySpawns", () => {
  it("emits the first Bone Knight when its time is crossed", () => {
    expect(getScriptedEnemySpawns(299.9, 300).map((spawn) => spawn.id)).toEqual(["bone_knight_elite"]);
  });

  it("emits the final captain at 10:00 without duplicating past events", () => {
    expect(getScriptedEnemySpawns(569.9, 570)).toEqual([]);
    const captain = getScriptedEnemySpawns(599.9, 600)[0];

    expect(captain.id).toBe("bone_knight_captain");
    expect(captain.enemyId).toBe("bone_knight");
    expect(captain.hpMultiplier).toBe(2.2);
    expect(getScriptedEnemySpawns(600, 600.5)).toEqual([]);
  });
});
