import Phaser from "phaser";
import {
  canBuyMetaUpgrade,
  getMetaUpgradeCost,
  META_UPGRADE_DEFINITIONS,
  type MetaUpgradeId
} from "../../domain/metaProgression";
import type { SaveData } from "../../domain/save";
import { formatMetaLevelText } from "../formatters/meta";
import { addOverlayButton, addOverlayRectangle, addOverlayText, type OverlayObjectList } from "./overlayPrimitives";

export function renderMetaUpgradesOverlay(params: {
  scene: Phaser.Scene;
  overlayObjects: OverlayObjectList;
  saveData: SaveData;
  onBuyMetaUpgrade: (id: MetaUpgradeId) => void;
  onStartRun: () => void;
  onBack: () => void;
}): void {
  const { scene, overlayObjects, saveData } = params;
  const { width, height } = scene.scale;
  const panelWidth = Math.min(width - 48, 760);
  const cardWidth = Math.min(width - 64, 700);
  const cardHeight = width < 720 ? 86 : 74;
  const startY = width < 720 ? 150 : 154;

  addOverlayRectangle(scene, overlayObjects, width / 2, height / 2, width, height, 0x090807, 0.78);
  addOverlayText(scene, overlayObjects, width / 2, 58, "Постоянные улучшения", width < 520 ? 30 : 40, "#f4ead7", "700")
    .setOrigin(0.5)
    .setWordWrapWidth(width - 44);
  addOverlayText(scene, overlayObjects, width / 2, 104, `Кости: ${saveData.bones}`, 22, "#e5d39f", "700")
    .setOrigin(0.5)
    .setWordWrapWidth(panelWidth);

  META_UPGRADE_DEFINITIONS.forEach((definition, index) => {
    const level = saveData.meta[definition.id];
    const maxed = level >= definition.maxLevel;
    const cost = getMetaUpgradeCost(definition.id, level);
    const canBuy = canBuyMetaUpgrade(saveData, definition.id);
    const y = startY + index * (cardHeight + 10);
    const card = addOverlayRectangle(scene, overlayObjects, width / 2, y, cardWidth, cardHeight, 0x171c17, 0.97);
    card.setStrokeStyle(1, canBuy ? 0xc9b46a : 0x44503e, 0.9);

    const leftX = width / 2 - cardWidth / 2 + 20;
    const buttonX = width / 2 + cardWidth / 2 - 72;
    addOverlayText(scene, overlayObjects, leftX, y - 24, definition.name, 18, "#f4ead7", "700")
      .setOrigin(0, 0.5)
      .setWordWrapWidth(cardWidth - 170);
    addOverlayText(
      scene,
      overlayObjects,
      leftX,
      y,
      `${formatMetaLevelText(definition.id, level)}   ${definition.effectPerLevel}`,
      14,
      "#cfc4b0"
    )
      .setOrigin(0, 0.5)
      .setWordWrapWidth(cardWidth - 170);
    addOverlayText(scene, overlayObjects, leftX, y + 23, `Уровень ${level}/${definition.maxLevel}`, 14, "#8d9587")
      .setOrigin(0, 0.5);

    addOverlayButton(scene, overlayObjects, buttonX, y, 122, 38, maxed ? "Макс" : `${cost}`, () => params.onBuyMetaUpgrade(definition.id), canBuy);
  });

  addOverlayButton(scene, overlayObjects, width / 2 - 112, height - 54, 190, 46, "Начать ночь", params.onStartRun);
  addOverlayButton(scene, overlayObjects, width / 2 + 112, height - 54, 150, 46, "Назад", params.onBack);
}
