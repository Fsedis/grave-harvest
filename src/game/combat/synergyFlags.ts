import { hasActiveSynergy } from "../../domain/synergies";
import type { UpgradeState } from "../../domain/upgrades";

export type ActiveSynergyFlags = {
  knivesApplyBurn: boolean;
  knivesPierce: boolean;
  knivesBleedBonus: boolean;
  bellCandleBurn: boolean;
  crowsFlameBurst: boolean;
  bellBonusCrow: boolean;
};

export function getActiveSynergyFlags(upgrades: UpgradeState): ActiveSynergyFlags {
  return {
    knivesApplyBurn: hasActiveSynergy(upgrades, "synergy_knives_candle_burn"),
    knivesPierce: hasActiveSynergy(upgrades, "synergy_knives_bell_pierce"),
    knivesBleedBonus: hasActiveSynergy(upgrades, "synergy_knives_crows_bleed"),
    bellCandleBurn: hasActiveSynergy(upgrades, "synergy_candle_bell_burn"),
    crowsFlameBurst: hasActiveSynergy(upgrades, "synergy_candle_crows_flame"),
    bellBonusCrow: hasActiveSynergy(upgrades, "synergy_bell_crows_bonus")
  };
}
