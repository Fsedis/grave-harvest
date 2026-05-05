import Phaser from "phaser";
import type { SaveData } from "../../domain/save";
import { formatTimer } from "../formatters/time";
import { addOverlayButton, addOverlayRectangle, addOverlayText, type OverlayObjectList } from "./overlayPrimitives";

export function renderMainMenuOverlay(params: {
  scene: Phaser.Scene;
  overlayObjects: OverlayObjectList;
  saveData: SaveData;
  onStartRun: () => void;
  onOpenSettings: () => void;
  onOpenMetaUpgrades: () => void;
  onResetProgress: () => void;
}): void {
  const { scene, overlayObjects, saveData } = params;
  const { width, height } = scene.scale;
  const titleSize = Phaser.Math.Clamp(Math.floor(width / 12.6), 32, 58);
  const subtitleWidth = Math.max(260, width - 80);

  addOverlayRectangle(scene, overlayObjects, width / 2, height / 2, width, height, 0x0a0d0b, 0.78);
  addOverlayText(scene, overlayObjects, width / 2, height / 2 - 135, "GRAVE HARVEST", titleSize, "#f2e7ce", "700")
    .setOrigin(0.5)
    .setWordWrapWidth(width - 36);
  addOverlayText(
    scene,
    overlayObjects,
    width / 2,
    height / 2 - 72,
    "Двигайся WASD или стрелками. Атаки автоматические. Собирай души, чтобы стать сильнее.",
    18,
    "#cfc3ad"
  )
    .setOrigin(0.5)
    .setWordWrapWidth(subtitleWidth);
  addOverlayText(
    scene,
    overlayObjects,
    width / 2,
    height / 2 - 24,
    `Кости: ${saveData.bones}   Лучшее: ${formatTimer(saveData.stats.bestTime)}   Победы: ${saveData.stats.wins}/${saveData.stats.totalRuns}`,
    18,
    "#e5d39f",
    "700"
  )
    .setOrigin(0.5)
    .setWordWrapWidth(subtitleWidth);
  addOverlayButton(scene, overlayObjects, width / 2, height / 2 + 18, 220, 52, "Начать ночь", params.onStartRun);
  addOverlayButton(scene, overlayObjects, width / 2, height / 2 + 78, 230, 46, "Настройки", params.onOpenSettings);
  addOverlayButton(
    scene,
    overlayObjects,
    width / 2,
    height / 2 + 134,
    270,
    46,
    "Постоянные улучшения",
    params.onOpenMetaUpgrades
  );
  addOverlayButton(scene, overlayObjects, width / 2, height / 2 + 190, 210, 42, "Сбросить прогресс", params.onResetProgress);
  addOverlayText(scene, overlayObjects, width / 2, height / 2 + 238, "Enter тоже запускает забег", 15, "#8f9687").setOrigin(0.5);
}
