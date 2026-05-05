import type Phaser from "phaser";
import { markFirstRunHintsSeen, type SaveData } from "../../domain/save";

export const FIRST_RUN_HINTS = [
  "Двигайся WASD или стрелками. Остановиться на кладбище — плохая идея.",
  "Атаки автоматические. Держи дистанцию и веди толпу за собой.",
  "Собирай голубые души: они дают уровни и новые проклятия."
];

export type FirstRunHintDecision = {
  saveData: SaveData;
  shouldPersist: boolean;
  messages: string[];
};

export function consumeFirstRunHints(saveData: SaveData): FirstRunHintDecision {
  if (saveData.tutorial.firstRunHintsSeen) {
    return {
      saveData,
      shouldPersist: false,
      messages: []
    };
  }

  return {
    saveData: markFirstRunHintsSeen(saveData),
    shouldPersist: true,
    messages: FIRST_RUN_HINTS
  };
}

export class FirstRunHintController {
  private hintObjects: Phaser.GameObjects.GameObject[] = [];
  private hintTimers: Phaser.Time.TimerEvent[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly isPlaying: () => boolean
  ) {}

  showIfNeeded(
    saveData: SaveData,
    persistSave: (saveData: SaveData) => void
  ): SaveData {
    const decision = consumeFirstRunHints(saveData);

    if (!decision.shouldPersist) {
      return decision.saveData;
    }

    persistSave(decision.saveData);
    this.scheduleHints(decision.messages);
    return decision.saveData;
  }

  clear(): void {
    this.hintTimers.forEach((timer) => timer.remove(false));
    this.hintTimers = [];
    this.clearHintObjects();
  }

  private scheduleHints(messages: string[]): void {
    messages.forEach((message, index) => {
      const timer = this.scene.time.delayedCall(850 + index * 4100, () => {
        if (this.isPlaying()) {
          this.showGameplayHint(message);
        }
      });
      this.hintTimers.push(timer);
    });
  }

  private showGameplayHint(message: string): void {
    this.clearHintObjects();

    const { width, height } = this.scene.scale;
    const compact = width < 760;
    const boxWidth = Math.min(width - 48, compact ? 430 : 560);
    const boxHeight = compact ? 58 : 54;
    const x = width / 2;
    const y = height - (compact ? 104 : 96);
    const back = this.scene.add
      .rectangle(x, y, boxWidth, boxHeight, 0x111612, 0.94)
      .setStrokeStyle(1, 0xc9b46a, 0.8)
      .setScrollFactor(0)
      .setDepth(1500);
    const text = this.scene.add
      .text(x, y, message, {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: compact ? "15px" : "17px",
        fontStyle: "700",
        color: "#f4ead7",
        align: "center",
        wordWrap: { width: boxWidth - 36 }
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1501);

    this.hintObjects.push(back, text);
    this.scene.tweens.add({
      targets: this.hintObjects,
      alpha: { from: 0, to: 1 },
      y: y - 8,
      duration: 180,
      ease: "Quad.easeOut"
    });

    const hideTimer = this.scene.time.delayedCall(3200, () => this.fadeOutHints());
    this.hintTimers.push(hideTimer);
  }

  private fadeOutHints(): void {
    if (this.hintObjects.length === 0) {
      return;
    }

    this.scene.tweens.add({
      targets: this.hintObjects,
      alpha: 0,
      duration: 220,
      ease: "Quad.easeOut",
      onComplete: () => this.clearHintObjects()
    });
  }

  private clearHintObjects(): void {
    this.hintObjects.forEach((object) => {
      this.scene.tweens.killTweensOf(object);
      object.destroy();
    });
    this.hintObjects = [];
  }
}
