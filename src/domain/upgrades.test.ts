import { describe, expect, it } from "vitest";
import {
  applyUpgrade,
  createInitialUpgradeState,
  getAvailableUpgrades,
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

  it("does not offer unlock cards for weapons without gameplay implementation", () => {
    const state = createInitialUpgradeState();

    expect(getAvailableUpgrades(state).some((upgrade) => upgrade.id === "unlock_candle")).toBe(false);
    expect(getAvailableUpgrades(state).some((upgrade) => upgrade.id === "unlock_bell")).toBe(false);
    expect(getAvailableUpgrades(state).some((upgrade) => upgrade.id === "unlock_crows")).toBe(false);
  });
});

describe("selectUpgradeOptions", () => {
  it("returns unique upgrade cards", () => {
    const state = createInitialUpgradeState();
    const options = selectUpgradeOptions(state, () => 0.1, 3);

    expect(options).toHaveLength(3);
    expect(new Set(options.map((option) => option.id)).size).toBe(3);
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
