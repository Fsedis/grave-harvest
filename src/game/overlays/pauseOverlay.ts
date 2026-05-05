import Phaser from "phaser";
import { formatActiveSynergySummary } from "../../domain/synergies";
import type { UpgradeState } from "../../domain/upgrades";
import { formatTimer } from "../formatters/time";
import { formatWeaponName } from "../formatters/weapons";
import { addOverlayButton, addOverlayRectangle, addOverlayText, type OverlayObjectList } from "./overlayPrimitives";

export type PauseRunSnapshot = {
  timeElapsed: number;
  level: number;
  kills: number;
  bonesCollected: number;
  upgrades: UpgradeState;
};

export function renderPauseOverlay(params: {
  scene: Phaser.Scene;
  overlayObjects: OverlayObjectList;
  run: PauseRunSnapshot;
  onResume: () => void;
  onOpenSettings: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
}): void {
  const { scene, overlayObjects, run } = params;
  const { width, height } = scene.scale;
  const panelWidth = Math.min(width - 48, 780);
  const panelHeight = Math.min(height - 56, 500);
  const panelX = width / 2;
  const panelY = height / 2;
  const leftX = panelX - panelWidth / 2 + 34;
  const topY = panelY - panelHeight / 2 + 38;
  const compact = width < 760;
  const activeWeapons = run.upgrades.weapons.map(formatWeaponName).join(", ");
  const activeSynergies = formatActiveSynergySummary(run.upgrades);

  addOverlayRectangle(scene, overlayObjects, width / 2, height / 2, width, height, 0x0b0e0c, 0.58);
  const panel = addOverlayRectangle(scene, overlayObjects, panelX, panelY, panelWidth, panelHeight, 0x111612, 0.96);
  panel.setStrokeStyle(2, 0x4d5a43, 0.95);
  addOverlayText(scene, overlayObjects, panelX, topY, "Пауза", compact ? 34 : 42, "#f4ead7", "700").setOrigin(0.5);

  addOverlayText(
    scene,
    overlayObjects,
    leftX,
    topY + 54,
    `Время ${formatTimer(run.timeElapsed)}   Уровень ${run.level}   Убийства ${run.kills}   Кости ${run.bonesCollected}`,
    compact ? 16 : 18,
    "#e5d39f",
    "700"
  )
    .setOrigin(0, 0.5)
    .setWordWrapWidth(panelWidth - 68);
  addOverlayText(scene, overlayObjects, leftX, topY + 88, `Оружие: ${activeWeapons}`, compact ? 15 : 16, "#d9cfba")
    .setOrigin(0, 0.5)
    .setWordWrapWidth(panelWidth - 68);
  addOverlayText(scene, overlayObjects, leftX, topY + 116, `Синергии: ${activeSynergies}`, compact ? 15 : 16, "#f3d58b")
    .setOrigin(0, 0.5)
    .setWordWrapWidth(panelWidth - 68);

  const helpY = topY + (compact ? 154 : 164);
  addOverlayText(scene, overlayObjects, leftX, helpY, "Краткая справка", 20, "#f4ead7", "700")
    .setOrigin(0, 0.5)
    .setWordWrapWidth(panelWidth - 68);
  [
    "WASD / стрелки — движение.",
    "Оружие атакует автоматически: управляй позицией, не прицелом.",
    "Голубые души дают опыт и выбор проклятий.",
    "На level-up выбирай карту мышью или клавишами 1 / 2 / 3.",
    "Цель: пережить ночь и убить Капитана после 10:00."
  ].forEach((line, index) => {
    addOverlayText(scene, overlayObjects, leftX, helpY + 32 + index * 24, line, compact ? 14 : 16, "#cfc4b0")
      .setOrigin(0, 0.5)
      .setWordWrapWidth(panelWidth - 68);
  });

  const buttonY = panelY + panelHeight / 2 - 48;
  const buttonGap = compact ? 12 : 16;
  const buttonWidth = compact ? 154 : 170;
  const totalButtonWidth = buttonWidth * 4 + buttonGap * 3;
  const firstButtonX = panelX - totalButtonWidth / 2 + buttonWidth / 2;
  addOverlayButton(scene, overlayObjects, firstButtonX, buttonY, buttonWidth, 44, "Продолжить", params.onResume);
  addOverlayButton(scene, overlayObjects, firstButtonX + (buttonWidth + buttonGap), buttonY, buttonWidth, 44, "Настройки", params.onOpenSettings);
  addOverlayButton(scene, overlayObjects, firstButtonX + (buttonWidth + buttonGap) * 2, buttonY, buttonWidth, 44, "Заново", params.onRestart);
  addOverlayButton(scene, overlayObjects, firstButtonX + (buttonWidth + buttonGap) * 3, buttonY, buttonWidth, 44, "Главное меню", params.onMainMenu);
}
