import { describe, expect, it } from "vitest";
import { createInitialUpgradeState } from "../../domain/upgrades";
import { getActiveSynergyFlags } from "./synergyFlags";

describe("getActiveSynergyFlags", () => {
  it("maps active run synergies to combat flags", () => {
    const state = createInitialUpgradeState();
    state.synergies.push(
      "synergy_knives_candle_burn",
      "synergy_candle_crows_flame",
      "synergy_bell_crows_bonus"
    );

    expect(getActiveSynergyFlags(state)).toEqual({
      knivesApplyBurn: true,
      knivesPierce: false,
      knivesBleedBonus: false,
      bellCandleBurn: false,
      crowsFlameBurst: true,
      bellBonusCrow: true
    });
  });

  it("ignores unknown synergy ids", () => {
    const state = createInitialUpgradeState();
    state.synergies.push("unknown_synergy");

    expect(getActiveSynergyFlags(state)).toEqual({
      knivesApplyBurn: false,
      knivesPierce: false,
      knivesBleedBonus: false,
      bellCandleBurn: false,
      crowsFlameBurst: false,
      bellBonusCrow: false
    });
  });
});
