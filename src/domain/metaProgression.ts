import type { MetaUpgradeLevels, SaveData } from "./save";
import type { UpgradeState } from "./upgrades";

export type MetaUpgradeId = keyof MetaUpgradeLevels;

export type MetaUpgradeDefinition = {
  id: MetaUpgradeId;
  name: string;
  description: string;
  effectPerLevel: string;
  maxLevel: number;
  baseCost: number;
};

export const META_UPGRADE_DEFINITIONS: MetaUpgradeDefinition[] = [
  {
    id: "meta_hp",
    name: "Могильная плоть",
    description: "Больше стартового здоровья.",
    effectPerLevel: "+10 стартового ОЗ",
    maxLevel: 5,
    baseCost: 40
  },
  {
    id: "meta_damage",
    name: "Старое проклятие",
    description: "Больше стартового урона.",
    effectPerLevel: "+5% стартового урона",
    maxLevel: 5,
    baseCost: 50
  },
  {
    id: "meta_pickup",
    name: "Длинная рука",
    description: "Больше стартового радиуса подбора.",
    effectPerLevel: "+10% радиуса подбора",
    maxLevel: 5,
    baseCost: 35
  },
  {
    id: "meta_rare",
    name: "Чтец знамений",
    description: "Чаще появляются редкие апгрейды.",
    effectPerLevel: "+1% шанс редких карт",
    maxLevel: 5,
    baseCost: 60
  },
  {
    id: "meta_retention",
    name: "Костяная страховка",
    description: "Больше костей сохраняется после смерти.",
    effectPerLevel: "+5% retention после смерти",
    maxLevel: 5,
    baseCost: 45
  }
];

export function getMetaUpgradeDefinition(id: MetaUpgradeId): MetaUpgradeDefinition {
  const definition = META_UPGRADE_DEFINITIONS.find((upgrade) => upgrade.id === id);

  if (!definition) {
    throw new Error(`Unknown meta upgrade: ${id}`);
  }

  return definition;
}

export function getMetaUpgradeCost(id: MetaUpgradeId, currentLevel: number): number {
  const definition = getMetaUpgradeDefinition(id);

  return Math.floor(definition.baseCost * Math.pow(currentLevel + 1, 1.35));
}

export function canBuyMetaUpgrade(save: SaveData, id: MetaUpgradeId): boolean {
  const definition = getMetaUpgradeDefinition(id);
  const currentLevel = save.meta[id];

  return currentLevel < definition.maxLevel && save.bones >= getMetaUpgradeCost(id, currentLevel);
}

export function purchaseMetaUpgrade(
  save: SaveData,
  id: MetaUpgradeId
): { purchased: boolean; save: SaveData } {
  if (!canBuyMetaUpgrade(save, id)) {
    return { purchased: false, save };
  }

  const cost = getMetaUpgradeCost(id, save.meta[id]);
  const nextSave: SaveData = {
    ...save,
    bones: save.bones - cost,
    meta: {
      ...save.meta,
      [id]: save.meta[id] + 1
    }
  };

  return { purchased: true, save: nextSave };
}

export function applyMetaToUpgradeState(state: UpgradeState, meta: MetaUpgradeLevels): void {
  state.maxHp += meta.meta_hp * 10;
  state.damageMultiplier *= 1 + meta.meta_damage * 0.05;
  state.pickupRadius *= 1 + meta.meta_pickup * 0.1;
  state.rareChanceBonus += meta.meta_rare * 0.01;
}

export function getMetaRetentionBonus(meta: MetaUpgradeLevels): number {
  return meta.meta_retention * 0.05;
}
