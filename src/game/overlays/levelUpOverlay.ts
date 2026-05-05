import Phaser from "phaser";
import type { UpgradeDefinition } from "../../domain/upgrades";
import { colorToCss } from "../formatters/colors";
import { formatUpgradeCardLabel, getUpgradeCardColor } from "../formatters/upgrades";
import { addOverlayRectangle, addOverlayText, type OverlayObjectList } from "./overlayPrimitives";

export function renderLevelUpOverlay(params: {
  scene: Phaser.Scene;
  overlayObjects: OverlayObjectList;
  currentUpgradeOptions: UpgradeDefinition[];
  getUpgradeStacks: (upgradeId: string) => number;
  onPickUpgrade: (index: number) => void;
}): void {
  const { scene, overlayObjects } = params;
  const { width, height } = scene.scale;
  const compact = width < 760;
  addOverlayRectangle(scene, overlayObjects, width / 2, height / 2, width, height, 0x090b0a, 0.64);
  addOverlayText(scene, overlayObjects, width / 2, 72, "Выбери проклятие", width < 520 ? 30 : 40, "#f4ead7", "700")
    .setOrigin(0.5)
    .setWordWrapWidth(width - 40);

  const cardWidth = compact ? Math.min(width - 48, 360) : Math.min(300, (width - 120) / 3);
  const cardHeight = compact ? 150 : 210;
  const totalWidth = cardWidth * params.currentUpgradeOptions.length + 20 * (params.currentUpgradeOptions.length - 1);
  const startX = width / 2 - totalWidth / 2 + cardWidth / 2;
  const startY = compact ? 170 : height / 2 + 12;

  params.currentUpgradeOptions.forEach((upgrade, index) => {
    const x = compact ? width / 2 : startX + index * (cardWidth + 20);
    const y = compact ? startY + index * (cardHeight + 14) : startY;
    const rarityColor = getUpgradeCardColor(upgrade);
    const cardFill = upgrade.category === "synergy" ? 0x24190f : 0x1d211d;
    const card = addOverlayRectangle(scene, overlayObjects, x, y, cardWidth, cardHeight, cardFill, 0.97);
    card.setStrokeStyle(2, rarityColor, 1);
    card.setInteractive({ useHandCursor: true });
    card.on("pointerdown", () => params.onPickUpgrade(index));

    addOverlayText(scene, overlayObjects, compact ? x - cardWidth / 2 + 28 : x, compact ? y - 48 : y - 74, `${index + 1}`, 22, "#151a16", "700")
      .setOrigin(0.5)
      .setBackgroundColor("#f1e3bd")
      .setPadding(9, 3, 9, 3);
    addOverlayText(scene, overlayObjects, compact ? x + 22 : x, compact ? y - 48 : y - 34, upgrade.name, compact ? 18 : 22, "#f4ead7", "700")
      .setOrigin(0.5)
      .setWordWrapWidth(compact ? cardWidth - 92 : cardWidth - 34);
    addOverlayText(scene, overlayObjects, x, compact ? y - 16 : y + 2, formatUpgradeCardLabel(upgrade), 14, colorToCss(rarityColor), "700").setOrigin(0.5);
    addOverlayText(scene, overlayObjects, x, compact ? y + 25 : y + 50, upgrade.description, compact ? 15 : 16, "#cfc4b0")
      .setOrigin(0.5)
      .setWordWrapWidth(cardWidth - 44);
    const stacks = params.getUpgradeStacks(upgrade.id);
    addOverlayText(scene, overlayObjects, x, compact ? y + 58 : y + 88, `${stacks}/${upgrade.maxStacks}`, 14, "#8d9587").setOrigin(0.5);
  });
}
