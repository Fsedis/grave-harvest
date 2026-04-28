import { describe, expect, it } from "vitest";
import { createInitialUpgradeState, UPGRADE_DEFINITIONS } from "./upgrades";
import {
  formatActiveSynergySummary,
  getActiveSynergies,
  getActiveSynergyIds,
  getActiveSynergyNames,
  hasActiveSynergy,
  SYNERGY_DEFINITIONS
} from "./synergies";

describe("synergy definitions", () => {
  it("defines one synergy for every current weapon pair", () => {
    expect(SYNERGY_DEFINITIONS.map((synergy) => synergy.id)).toEqual([
      "synergy_knives_candle_burn",
      "synergy_knives_bell_pierce",
      "synergy_knives_crows_bleed",
      "synergy_candle_bell_burn",
      "synergy_candle_crows_flame",
      "synergy_bell_crows_bonus"
    ]);
  });

  it("keeps every synergy card rare, single-stack and marked as a synergy", () => {
    const synergyUpgrades = UPGRADE_DEFINITIONS.filter((upgrade) => upgrade.category === "synergy");

    expect(synergyUpgrades.map((upgrade) => ({
      id: upgrade.id,
      rarity: upgrade.rarity,
      maxStacks: upgrade.maxStacks,
      category: upgrade.category
    }))).toEqual([
      {
        id: "synergy_knives_candle_burn",
        rarity: "rare",
        maxStacks: 1,
        category: "synergy"
      },
      {
        id: "synergy_knives_bell_pierce",
        rarity: "rare",
        maxStacks: 1,
        category: "synergy"
      },
      {
        id: "synergy_knives_crows_bleed",
        rarity: "rare",
        maxStacks: 1,
        category: "synergy"
      },
      {
        id: "synergy_candle_bell_burn",
        rarity: "rare",
        maxStacks: 1,
        category: "synergy"
      },
      {
        id: "synergy_candle_crows_flame",
        rarity: "rare",
        maxStacks: 1,
        category: "synergy"
      },
      {
        id: "synergy_bell_crows_bonus",
        rarity: "rare",
        maxStacks: 1,
        category: "synergy"
      }
    ]);
  });
});

describe("active synergy helpers", () => {
  it("reports active synergy ids and definitions from the run state", () => {
    const state = createInitialUpgradeState();
    state.synergies.push("synergy_knives_candle_burn", "synergy_bell_crows_bonus");

    expect(getActiveSynergyIds(state)).toEqual([
      "synergy_knives_candle_burn",
      "synergy_bell_crows_bonus"
    ]);
    expect(getActiveSynergies(state).map((synergy) => synergy.id)).toEqual([
      "synergy_knives_candle_burn",
      "synergy_bell_crows_bonus"
    ]);
  });

  it("does not treat unknown or inactive synergy ids as active definitions", () => {
    const state = createInitialUpgradeState();
    state.synergies.push("synergy_knives_candle_burn", "unknown_synergy");

    expect(hasActiveSynergy(state, "synergy_knives_candle_burn")).toBe(true);
    expect(hasActiveSynergy(state, "synergy_bell_crows_bonus")).toBe(false);
    expect(hasActiveSynergy(state, "unknown_synergy")).toBe(false);
    expect(getActiveSynergies(state).map((synergy) => synergy.id)).toEqual([
      "synergy_knives_candle_burn"
    ]);
  });

  it("formats active synergy names for HUD and result screens", () => {
    const state = createInitialUpgradeState();
    state.synergies.push("synergy_knives_candle_burn", "synergy_bell_crows_bonus");

    expect(getActiveSynergyNames(state)).toEqual(["Пламенные ножи", "Воронья панихида"]);
    expect(formatActiveSynergySummary(state)).toBe("Пламенные ножи, Воронья панихида");
  });

  it("uses a readable fallback when no synergies are active", () => {
    const state = createInitialUpgradeState();

    expect(getActiveSynergyNames(state)).toEqual([]);
    expect(formatActiveSynergySummary(state)).toBe("нет");
  });
});
