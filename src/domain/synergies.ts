import type { UpgradeState } from "./upgrades";

export type SynergyDefinition = {
  id: string;
  name: string;
  description: string;
  weaponPair: readonly [string, string];
};

export const SYNERGY_DEFINITIONS: SynergyDefinition[] = [
  {
    id: "synergy_knives_candle_burn",
    name: "Пламенные ножи",
    description: "Костяные ножи поджигают врагов, если собрана Святая свеча.",
    weaponPair: ["bone_knives", "holy_candle"]
  },
  {
    id: "synergy_knives_bell_pierce",
    name: "Пробивающий набат",
    description: "Костяные ножи получают пробивание, если собран Могильный колокол.",
    weaponPair: ["bone_knives", "grave_bell"]
  },
  {
    id: "synergy_knives_crows_bleed",
    name: "Кровавая стая",
    description: "Вороны ранят врагов, а ножи сильнее бьют по кровоточащим целям.",
    weaponPair: ["bone_knives", "crow_swarm"]
  },
  {
    id: "synergy_candle_bell_burn",
    name: "Погребальное пламя",
    description: "Могильный колокол вызывает дополнительный свечной ожог в радиусе.",
    weaponPair: ["holy_candle", "grave_bell"]
  },
  {
    id: "synergy_candle_crows_flame",
    name: "Пепельные вороны",
    description: "Вороны вызывают вспышку пламени при попадании.",
    weaponPair: ["holy_candle", "crow_swarm"]
  },
  {
    id: "synergy_bell_crows_bonus",
    name: "Воронья панихида",
    description: "Каждый удар Могильного колокола выпускает бонусную ворону.",
    weaponPair: ["grave_bell", "crow_swarm"]
  }
];

export function hasActiveSynergy(state: UpgradeState, synergyId: string): boolean {
  return state.synergies.includes(synergyId) && isKnownSynergy(synergyId);
}

export function getActiveSynergyIds(state: UpgradeState): string[] {
  return state.synergies.filter(isKnownSynergy);
}

export function getActiveSynergies(state: UpgradeState): SynergyDefinition[] {
  const activeIds = new Set(getActiveSynergyIds(state));

  return SYNERGY_DEFINITIONS.filter((synergy) => activeIds.has(synergy.id));
}

function isKnownSynergy(synergyId: string): boolean {
  return SYNERGY_DEFINITIONS.some((synergy) => synergy.id === synergyId);
}
