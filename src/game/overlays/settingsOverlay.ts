import Phaser from "phaser";
import type { SettingsData } from "../../domain/save";
import { roundVolume } from "../formatters/volume";
import {
  addMiniSettingsButton,
  addOverlayButton,
  addOverlayRectangle,
  addOverlayText,
  type OverlayObjectList
} from "./overlayPrimitives";

export function renderSettingsOverlay(params: {
  scene: Phaser.Scene;
  overlayObjects: OverlayObjectList;
  settings: SettingsData;
  onUpdateSettings: (patch: Partial<SettingsData>) => void;
  onClose: () => void;
  onResetProgress: () => void;
}): void {
  const { scene, overlayObjects, settings } = params;
  const { width, height } = scene.scale;
  const panelWidth = Math.min(width - 48, 620);
  const titleY = 72;
  const startY = 166;
  const rowGap = 60;

  addOverlayRectangle(scene, overlayObjects, width / 2, height / 2, width, height, 0x090807, 0.8);
  addOverlayText(scene, overlayObjects, width / 2, titleY, "Настройки", width < 520 ? 32 : 42, "#f4ead7", "700")
    .setOrigin(0.5)
    .setWordWrapWidth(width - 44);
  addOverlayText(scene, overlayObjects, width / 2, titleY + 48, "Визуальный отклик", 18, "#e5d39f", "700")
    .setOrigin(0.5)
    .setWordWrapWidth(panelWidth);

  addSettingsToggle(scene, overlayObjects, width / 2, startY, panelWidth, "Тряска экрана", settings.screenShake, () =>
    params.onUpdateSettings({ screenShake: !settings.screenShake })
  );
  addSettingsToggle(scene, overlayObjects, width / 2, startY + rowGap, panelWidth, "Числа урона", settings.damageNumbers, () =>
    params.onUpdateSettings({ damageNumbers: !settings.damageNumbers })
  );
  addVolumeControl(scene, overlayObjects, width / 2, startY + rowGap * 2, panelWidth, "Общая громкость", settings.masterVolume, (value) =>
    params.onUpdateSettings({ masterVolume: value })
  );
  addVolumeControl(scene, overlayObjects, width / 2, startY + rowGap * 3, panelWidth, "Звуки", settings.sfxVolume, (value) =>
    params.onUpdateSettings({ sfxVolume: value })
  );
  addVolumeControl(scene, overlayObjects, width / 2, startY + rowGap * 4, panelWidth, "Музыка", settings.musicVolume, (value) =>
    params.onUpdateSettings({ musicVolume: value })
  );

  addOverlayButton(scene, overlayObjects, width / 2 - 112, height - 54, 150, 46, "Назад", params.onClose);
  addOverlayButton(scene, overlayObjects, width / 2 + 112, height - 54, 210, 46, "Сбросить прогресс", params.onResetProgress);
}

function addSettingsToggle(
  scene: Phaser.Scene,
  overlayObjects: OverlayObjectList,
  x: number,
  y: number,
  width: number,
  label: string,
  value: boolean,
  onClick: () => void
): void {
  const card = addOverlayRectangle(scene, overlayObjects, x, y, width, 56, 0x171c17, 0.97);
  card.setStrokeStyle(1, value ? 0xc9b46a : 0x44503e, 0.9);
  card.setInteractive({ useHandCursor: true });
  card.on("pointerdown", onClick);

  const leftX = x - width / 2 + 20;
  const toggleWidth = 104;
  const toggleX = x + width / 2 - toggleWidth / 2 - 16;
  const toggle = addOverlayRectangle(scene, overlayObjects, toggleX, y, toggleWidth, 34, value ? 0xc9b46a : 0x4b4438, 1);
  toggle.setStrokeStyle(2, value ? 0x4a3921 : 0x2c2d28, 1);
  toggle.setInteractive({ useHandCursor: true });
  toggle.on("pointerover", () => toggle.setFillStyle(value ? 0xe1cd7d : 0x62594a, 1));
  toggle.on("pointerout", () => toggle.setFillStyle(value ? 0xc9b46a : 0x4b4438, 1));
  toggle.on("pointerdown", onClick);

  addOverlayText(scene, overlayObjects, leftX, y, label, 20, "#f4ead7", "700")
    .setOrigin(0, 0.5)
    .setWordWrapWidth(width - toggleWidth - 60);
  addOverlayText(scene, overlayObjects, toggleX, y, value ? "Вкл" : "Выкл", 18, value ? "#17140f" : "#c9c0ad", "700").setOrigin(0.5);
}

function addVolumeControl(
  scene: Phaser.Scene,
  overlayObjects: OverlayObjectList,
  x: number,
  y: number,
  width: number,
  label: string,
  value: number,
  onChange: (value: number) => void
): void {
  const clampedValue = Phaser.Math.Clamp(value, 0, 1);
  const card = addOverlayRectangle(scene, overlayObjects, x, y, width, 56, 0x171c17, 0.97);
  card.setStrokeStyle(1, 0x44503e, 0.9);

  const leftX = x - width / 2 + 20;
  const minusX = x + width / 2 - 198;
  const trackX = x + width / 2 - 128;
  const plusX = x + width / 2 - 58;
  const valueX = x + width / 2 - 18;
  const trackWidth = 108;
  const fillWidth = Math.max(2, trackWidth * clampedValue);

  addOverlayText(scene, overlayObjects, leftX, y, label, 20, "#f4ead7", "700")
    .setOrigin(0, 0.5)
    .setWordWrapWidth(width - 310);
  addMiniSettingsButton(scene, overlayObjects, minusX, y, "-", () => onChange(roundVolume(clampedValue - 0.1)));
  addOverlayRectangle(scene, overlayObjects, trackX, y, trackWidth, 8, 0x4b4438, 1);
  addOverlayRectangle(scene, overlayObjects, trackX - trackWidth / 2 + fillWidth / 2, y, fillWidth, 8, 0xc9b46a, 1);
  addMiniSettingsButton(scene, overlayObjects, plusX, y, "+", () => onChange(roundVolume(clampedValue + 0.1)));
  addOverlayText(scene, overlayObjects, valueX, y, `${Math.round(clampedValue * 100)}%`, 16, "#e5d39f", "700").setOrigin(0.5);
}
