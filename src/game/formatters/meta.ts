import type { MetaUpgradeId } from "../../domain/metaProgression";

export function formatMetaLevelText(id: MetaUpgradeId, level: number): string {
  if (level <= 0) {
    return "Сейчас: нет";
  }

  if (id === "meta_hp") {
    return `Сейчас: +${level * 10} ОЗ`;
  }

  if (id === "meta_damage") {
    return `Сейчас: +${level * 5}% урона`;
  }

  if (id === "meta_pickup") {
    return `Сейчас: +${level * 10}% подбора`;
  }

  if (id === "meta_rare") {
    return `Сейчас: +${level}% редких карт`;
  }

  return `Сейчас: +${level * 5}% сохранения костей`;
}
