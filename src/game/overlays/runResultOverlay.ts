import Phaser from "phaser";
import type { RunEndSummary } from "../../domain/runSummary";
import { formatActiveSynergySummary } from "../../domain/synergies";
import type { UpgradeState } from "../../domain/upgrades";
import { formatTimer } from "../formatters/time";
import { addOverlayButton, addOverlayRectangle, addOverlayText, type OverlayObjectList } from "./overlayPrimitives";

export type RunResultSnapshot = {
  timeElapsed: number;
  kills: number;
  level: number;
  upgrades: UpgradeState;
};

type RunResultParams = {
  scene: Phaser.Scene;
  overlayObjects: OverlayObjectList;
  run: RunResultSnapshot;
  summary: RunEndSummary;
  saveBones: number;
  onOpenMetaUpgrades: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
};

export function renderGameOverOverlay(params: RunResultParams): void {
  const { scene, overlayObjects, run, summary } = params;
  const { width, height } = scene.scale;
  const bonusBones = summary.survivalBonus + summary.victoryBonus;
  const activeSynergies = formatActiveSynergySummary(run.upgrades);

  addOverlayRectangle(scene, overlayObjects, width / 2, height / 2, width, height, 0x090807, 0.76);
  addOverlayText(scene, overlayObjects, width / 2, height / 2 - 168, "Кладбище забрало своё", width < 520 ? 30 : 38, "#f4ead7", "700")
    .setOrigin(0.5)
    .setWordWrapWidth(width - 44);
  addOverlayText(scene, overlayObjects, width / 2, height / 2 - 100, `Выжил ${formatTimer(run.timeElapsed)}   Убийства ${run.kills}   Уровень ${run.level}`, 22, "#d9cfba")
    .setOrigin(0.5)
    .setWordWrapWidth(width - 48);
  addOverlayText(scene, overlayObjects, width / 2, height / 2 - 54, `Добыто ${summary.droppedBones}   Бонус ${bonusBones}   Сохранено ${summary.retainedBones}`, 20, "#e5d39f")
    .setOrigin(0.5)
    .setWordWrapWidth(width - 48);
  addOverlayText(scene, overlayObjects, width / 2, height / 2 - 14, `Баланс костей: ${params.saveBones}`, 20, "#f1dfaa", "700")
    .setOrigin(0.5)
    .setWordWrapWidth(width - 48);
  addOverlayText(scene, overlayObjects, width / 2, height / 2 + 24, `Синергии: ${activeSynergies}`, 17, "#f3d58b", "700")
    .setOrigin(0.5)
    .setWordWrapWidth(width - 56);
  addOverlayButton(scene, overlayObjects, width / 2, height / 2 + 82, 250, 52, "Потратить кости", params.onOpenMetaUpgrades);
  addOverlayButton(scene, overlayObjects, width / 2, height / 2 + 144, 210, 48, "Повторить", params.onRestart);
  addOverlayButton(scene, overlayObjects, width / 2, height / 2 + 202, 210, 44, "Главное меню", params.onMainMenu);
}

export function renderVictoryOverlay(params: RunResultParams): void {
  const { scene, overlayObjects, run, summary } = params;
  const { width, height } = scene.scale;
  const bonusBones = summary.survivalBonus + summary.victoryBonus;
  const activeSynergies = formatActiveSynergySummary(run.upgrades);

  addOverlayRectangle(scene, overlayObjects, width / 2, height / 2, width, height, 0x090807, 0.74);
  addOverlayText(scene, overlayObjects, width / 2, height / 2 - 176, "Ночь пережита", width < 520 ? 34 : 44, "#f4ead7", "700")
    .setOrigin(0.5)
    .setWordWrapWidth(width - 44);
  addOverlayText(scene, overlayObjects, width / 2, height / 2 - 118, "Капитан мёртв.", 22, "#f1dfaa", "700")
    .setOrigin(0.5)
    .setWordWrapWidth(width - 48);
  addOverlayText(scene, overlayObjects, width / 2, height / 2 - 72, `Время ${formatTimer(run.timeElapsed)}   Убийства ${run.kills}   Уровень ${run.level}`, 22, "#d9cfba")
    .setOrigin(0.5)
    .setWordWrapWidth(width - 48);
  addOverlayText(scene, overlayObjects, width / 2, height / 2 - 28, `Добыто ${summary.droppedBones}   Бонус ${bonusBones}   Сохранено ${summary.retainedBones}`, 20, "#e5d39f")
    .setOrigin(0.5)
    .setWordWrapWidth(width - 48);
  addOverlayText(scene, overlayObjects, width / 2, height / 2 + 12, `Баланс костей: ${params.saveBones}`, 20, "#f1dfaa", "700")
    .setOrigin(0.5)
    .setWordWrapWidth(width - 48);
  addOverlayText(scene, overlayObjects, width / 2, height / 2 + 48, `Синергии: ${activeSynergies}`, 17, "#f3d58b", "700")
    .setOrigin(0.5)
    .setWordWrapWidth(width - 56);
  addOverlayButton(scene, overlayObjects, width / 2, height / 2 + 106, 270, 52, "Постоянные улучшения", params.onOpenMetaUpgrades);
  addOverlayButton(scene, overlayObjects, width / 2, height / 2 + 168, 210, 48, "Следующий забег", params.onRestart);
  addOverlayButton(scene, overlayObjects, width / 2, height / 2 + 224, 210, 44, "Главное меню", params.onMainMenu);
}
