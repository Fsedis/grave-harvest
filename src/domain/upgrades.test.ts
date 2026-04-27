import { describe, expect, it } from "vitest";
import {
  applyUpgrade,
  createInitialUpgradeState,
  getAvailableUpgrades,
  getDerivedWeaponStats,
  pickUpgradeRarity,
  selectUpgradeOptions
} from "./upgrades";

describe("getAvailableUpgrades", () => {
  it("hides upgrades that reached their max stacks", () => {
    const state = createInitialUpgradeState();
    state.upgrades.damage_up = 5;

    expect(getAvailableUpgrades(state).some((upgrade) => upgrade.id === "damage_up")).toBe(false);
  });

  it("only offers weapon upgrades for owned weapons", () => {
    const state = createInitialUpgradeState();

    expect(getAvailableUpgrades(state).some((upgrade) => upgrade.id === "knife_projectile")).toBe(true);
    expect(getAvailableUpgrades(state).some((upgrade) => upgrade.id === "candle_area")).toBe(false);
  });

  it("offers unlock cards for implemented weapons the player does not own yet", () => {
    const state = createInitialUpgradeState();

    expect(getAvailableUpgrades(state).some((upgrade) => upgrade.id === "unlock_candle")).toBe(true);
    expect(getAvailableUpgrades(state).some((upgrade) => upgrade.id === "unlock_bell")).toBe(true);
    expect(getAvailableUpgrades(state).some((upgrade) => upgrade.id === "unlock_crows")).toBe(true);
  });

  it("hides unlock cards for weapons the player already owns", () => {
    const state = createInitialUpgradeState();
    applyUpgrade(state, "unlock_candle");

    expect(getAvailableUpgrades(state).some((upgrade) => upgrade.id === "unlock_candle")).toBe(false);
    expect(getAvailableUpgrades(state).some((upgrade) => upgrade.id === "candle_area")).toBe(true);
  });

  it("hides unlock cards when the weapon limit is reached", () => {
    const state = createInitialUpgradeState();
    state.weapons = ["bone_knives", "holy_candle", "grave_bell", "crow_swarm"];

    expect(getAvailableUpgrades(state).some((upgrade) => upgrade.id.startsWith("unlock_"))).toBe(false);
  });
});

describe("selectUpgradeOptions", () => {
  it("returns unique upgrade cards", () => {
    const state = createInitialUpgradeState();
    const options = selectUpgradeOptions(state, () => 0.1, 3);

    expect(options).toHaveLength(3);
    expect(new Set(options.map((option) => option.id)).size).toBe(3);
  });

  it("uses rarity weights when selecting cards", () => {
    const state = createInitialUpgradeState();
    applyUpgrade(state, "unlock_candle");
    applyUpgrade(state, "unlock_bell");
    applyUpgrade(state, "unlock_crows");
    const rng = createSequenceRng([0.96, 0, 0.72, 0, 0.1, 0]);

    const options = selectUpgradeOptions(state, rng, 3);

    expect(options.map((option) => option.rarity)).toEqual(["rare", "uncommon", "common"]);
  });
});

describe("pickUpgradeRarity", () => {
  it("maps rolls to the MVP rarity curve", () => {
    expect(pickUpgradeRarity(0)).toBe("common");
    expect(pickUpgradeRarity(0.699)).toBe("common");
    expect(pickUpgradeRarity(0.7)).toBe("uncommon");
    expect(pickUpgradeRarity(0.949)).toBe("uncommon");
    expect(pickUpgradeRarity(0.95)).toBe("rare");
    expect(pickUpgradeRarity(0.999)).toBe("rare");
  });
});

describe("applyUpgrade", () => {
  it("applies a global damage upgrade and tracks stacks", () => {
    const state = createInitialUpgradeState();

    applyUpgrade(state, "damage_up");

    expect(state.damageMultiplier).toBeCloseTo(1.15);
    expect(state.upgrades.damage_up).toBe(1);
  });

  it("unlocks Holy Candle as a second weapon", () => {
    const state = createInitialUpgradeState();

    applyUpgrade(state, "unlock_candle");

    expect(state.weapons).toContain("holy_candle");
    expect(state.upgrades.unlock_candle).toBe(1);
  });
});

describe("getDerivedWeaponStats", () => {
  it("applies candle radius and damage upgrades", () => {
    const state = createInitialUpgradeState();
    applyUpgrade(state, "unlock_candle");
    applyUpgrade(state, "candle_area");
    applyUpgrade(state, "candle_damage");

    const stats = getDerivedWeaponStats(state, "holy_candle");

    expect(stats.radius).toBeCloseTo(132);
    expect(stats.damage).toBeCloseTo(4.8);
  });

  it("applies bell cooldown and second pulse upgrades", () => {
    const state = createInitialUpgradeState();
    applyUpgrade(state, "unlock_bell");
    applyUpgrade(state, "bell_cooldown");
    applyUpgrade(state, "bell_double_pulse");

    const stats = getDerivedWeaponStats(state, "grave_bell");

    expect(stats.cooldown).toBeCloseTo(3.2);
    expect(stats.pulseCount).toBe(2);
  });

  it("applies extra crow and crow damage upgrades", () => {
    const state = createInitialUpgradeState();
    applyUpgrade(state, "unlock_crows");
    applyUpgrade(state, "crow_extra");
    applyUpgrade(state, "crow_damage");

    const stats = getDerivedWeaponStats(state, "crow_swarm");

    expect(stats.projectileCount).toBe(2);
    expect(stats.damage).toBeCloseTo(14.4);
  });
});

function createSequenceRng(values: number[]): () => number {
  let index = 0;

  return () => values[index++] ?? values[values.length - 1] ?? 0;
}
