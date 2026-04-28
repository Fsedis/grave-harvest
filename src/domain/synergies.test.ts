import { describe, expect, it } from "vitest";
import { createInitialUpgradeState } from "./upgrades";
import {
  getActiveSynergies,
  getActiveSynergyIds,
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
});
