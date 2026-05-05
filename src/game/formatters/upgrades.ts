import type { UpgradeDefinition } from "../../domain/upgrades";

type UpgradeCardFormat = Pick<UpgradeDefinition, "rarity" | "category">;

export function getUpgradeCardColor(upgrade: UpgradeCardFormat): number {
  if (upgrade.category === "synergy") {
    return 0xf2c15c;
  }

  if (upgrade.rarity === "rare") {
    return 0xd89cff;
  }

  if (upgrade.rarity === "uncommon") {
    return 0x7ed6ff;
  }

  return 0xd8d0bd;
}

export function formatUpgradeCardLabel(upgrade: UpgradeCardFormat): string {
  if (upgrade.category === "synergy") {
    return "СИНЕРГИЯ";
  }

  if (upgrade.rarity === "rare") {
    return "РЕДКОЕ";
  }

  if (upgrade.rarity === "uncommon") {
    return "НЕОБЫЧНОЕ";
  }

  return "ОБЫЧНОЕ";
}
