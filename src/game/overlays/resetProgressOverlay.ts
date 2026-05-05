import Phaser from "phaser";
import { addOverlayButton, addOverlayRectangle, addOverlayText, type OverlayObjectList } from "./overlayPrimitives";

export function renderResetProgressConfirmOverlay(params: {
  scene: Phaser.Scene;
  overlayObjects: OverlayObjectList;
  onConfirm: () => void;
  onBack: () => void;
}): void {
  const { scene, overlayObjects } = params;
  const { width, height } = scene.scale;

  addOverlayRectangle(scene, overlayObjects, width / 2, height / 2, width, height, 0x090807, 0.82);
  addOverlayText(scene, overlayObjects, width / 2, height / 2 - 94, "Сбросить прогресс?", width < 520 ? 28 : 36, "#f4ead7", "700")
    .setOrigin(0.5)
    .setWordWrapWidth(width - 44);
  addOverlayText(
    scene,
    overlayObjects,
    width / 2,
    height / 2 - 34,
    "Это удалит сохранённые кости, постоянные улучшения, статистику и настройки на этом устройстве.",
    18,
    "#d9cfba"
  )
    .setOrigin(0.5)
    .setWordWrapWidth(Math.min(width - 56, 560));
  addOverlayButton(scene, overlayObjects, width / 2 - 112, height / 2 + 58, 190, 48, "Да, сбросить", params.onConfirm);
  addOverlayButton(scene, overlayObjects, width / 2 + 112, height / 2 + 58, 150, 48, "Назад", params.onBack);
}
