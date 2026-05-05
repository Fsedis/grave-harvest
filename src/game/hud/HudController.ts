import Phaser from "phaser";
import { isLowHp } from "../../domain/effects";
import { getActiveSynergyNames } from "../../domain/synergies";
import { getDerivedWeaponStats, type UpgradeState } from "../../domain/upgrades";
import { formatSynergyHudLines } from "../formatters/synergies";
import { formatTimer } from "../formatters/time";
import { formatWeaponHudLine, getWeaponIconTexture } from "../formatters/weapons";

export type HudStatus =
  | "menu"
  | "playing"
  | "paused"
  | "level_up"
  | "game_over"
  | "victory"
  | "meta_upgrades"
  | "settings"
  | "reset_confirm";

export type HudRunSnapshot = {
  hp: number;
  maxHp: number;
  xp: number;
  xpToNext: number;
  level: number;
  timeElapsed: number;
  kills: number;
  bonesCollected: number;
  spawnBudget: number;
  upgrades: UpgradeState;
};

export type HudFinalBossSnapshot = {
  hp: number;
  maxHp: number;
} | null;

export type HudBalanceDebugSnapshot = {
  fps: number;
  playerSpeed: number;
  hitCooldown: number;
  activeEnemies: number;
  activeProjectiles: number;
  activePickups: number;
};

export type HudLayoutSnapshot = {
  status: HudStatus;
  run: HudRunSnapshot | null;
  finalBoss: HudFinalBossSnapshot;
  balanceDebug: HudBalanceDebugSnapshot;
};

type HudObject = Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text;

export class HudController {
  private hudObjects: HudObject[] = [];
  private hpFill!: Phaser.GameObjects.Rectangle;
  private xpBack!: Phaser.GameObjects.Rectangle;
  private xpFill!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private bonesText!: Phaser.GameObjects.Text;
  private killText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private weaponPanel!: Phaser.GameObjects.Rectangle;
  private weaponIcons: Phaser.GameObjects.Image[] = [];
  private weaponTexts: Phaser.GameObjects.Text[] = [];
  private synergyPanel!: Phaser.GameObjects.Rectangle;
  private synergyText!: Phaser.GameObjects.Text;
  private bossHpBack!: Phaser.GameObjects.Rectangle;
  private bossHpFill!: Phaser.GameObjects.Rectangle;
  private bossHpText!: Phaser.GameObjects.Text;
  private lowHpEdges: Phaser.GameObjects.Rectangle[] = [];
  private balanceDebugText: Phaser.GameObjects.Text | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly balanceDebugEnabled: boolean
  ) {}

  create(): void {
    const hpBack = this.scene.add.rectangle(24, 24, 260, 18, 0x241516, 0.9).setOrigin(0, 0);
    this.hpFill = this.scene.add.rectangle(24, 24, 260, 18, 0xb23a3a, 1).setOrigin(0, 0);
    this.hpText = this.scene.add.text(24, 46, "", { fontSize: "16px", color: "#f6ead4" });
    this.levelText = this.scene.add.text(24, 68, "", { fontSize: "16px", color: "#cdd6b8" });
    this.timerText = this.scene.add.text(0, 20, "00:00", {
      fontSize: "34px",
      color: "#f6ead4",
      fontStyle: "700"
    });
    this.bonesText = this.scene.add.text(0, 24, "", { fontSize: "18px", color: "#e5d39f" });
    this.killText = this.scene.add.text(0, 50, "", { fontSize: "16px", color: "#c9c0ad" });
    this.xpBack = this.scene.add.rectangle(24, 0, 100, 12, 0x10222a, 0.95).setOrigin(0, 0);
    this.xpFill = this.scene.add.rectangle(24, 0, 100, 12, 0x55bde0, 1).setOrigin(0, 0);
    this.weaponPanel = this.scene.add.rectangle(24, 0, 276, 40, 0x111612, 0.88).setOrigin(0, 0);
    this.weaponPanel.setStrokeStyle(1, 0x47513f, 0.9);
    this.synergyPanel = this.scene.add.rectangle(24, 0, 320, 42, 0x17130f, 0.9).setOrigin(0, 0);
    this.synergyPanel.setStrokeStyle(1, 0xd6a84f, 0.9);
    this.synergyText = this.scene.add.text(0, 0, "", {
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "13px",
      color: "#f3d58b",
      lineSpacing: 2
    });
    this.bossHpBack = this.scene.add.rectangle(0, 0, 440, 14, 0x261615, 0.95).setOrigin(0, 0);
    this.bossHpBack.setStrokeStyle(1, 0x6b5a3c, 0.95);
    this.bossHpFill = this.scene.add.rectangle(0, 0, 440, 14, 0xb44a3c, 1).setOrigin(0, 0);
    this.bossHpText = this.scene.add.text(0, 0, "", {
      fontSize: "16px",
      color: "#f2dfb0",
      fontStyle: "700"
    });
    this.lowHpEdges = [
      this.scene.add.rectangle(0, 0, 0, 0, 0x8b1515, 0).setOrigin(0, 0),
      this.scene.add.rectangle(0, 0, 0, 0, 0x8b1515, 0).setOrigin(0, 0),
      this.scene.add.rectangle(0, 0, 0, 0, 0x8b1515, 0).setOrigin(0, 0),
      this.scene.add.rectangle(0, 0, 0, 0, 0x8b1515, 0).setOrigin(0, 0)
    ];

    if (this.balanceDebugEnabled) {
      this.balanceDebugText = this.scene.add.text(0, 0, "", {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "12px",
        color: "#d8f0c8",
        backgroundColor: "rgba(10, 14, 10, 0.72)",
        padding: { x: 6, y: 4 }
      });
    }

    this.weaponIcons = [];
    this.weaponTexts = [];

    for (let index = 0; index < 4; index += 1) {
      this.weaponIcons.push(this.scene.add.image(0, 0, "weapon_bone_knives"));
      this.weaponTexts.push(this.scene.add.text(0, 0, "", { fontSize: "14px", color: "#efe3c8" }));
    }

    this.hudObjects = [
      hpBack,
      this.hpFill,
      this.hpText,
      this.levelText,
      this.timerText,
      this.bonesText,
      this.killText,
      this.xpBack,
      this.xpFill,
      this.weaponPanel,
      ...this.weaponIcons,
      ...this.weaponTexts,
      this.synergyPanel,
      this.synergyText,
      this.bossHpBack,
      this.bossHpFill,
      this.bossHpText,
      ...this.lowHpEdges
    ];

    if (this.balanceDebugText) {
      this.hudObjects.push(this.balanceDebugText);
    }

    this.hudObjects.forEach((object) => object.setScrollFactor(0).setDepth(1000));
    this.lowHpEdges.forEach((edge) => edge.setDepth(999));
    this.setVisible(false);
  }

  setVisible(visible: boolean): void {
    this.hudObjects.forEach((object) => object.setVisible(visible));
    if (!visible) {
      this.setLowHpWarningVisible(false);
    }
  }

  setLowHpWarningVisible(visible: boolean, alpha = 0): void {
    this.lowHpEdges.forEach((edge) => edge.setVisible(visible).setAlpha(alpha));
  }

  layout(snapshot: HudLayoutSnapshot): void {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const compact = width < 760;

    if (!snapshot.run) {
      this.timerText.setPosition(width / 2, 20).setOrigin(0.5, 0);
      return;
    }

    const hpBarWidth = compact ? Math.min(220, width * 0.48) : 260;
    const hpX = compact ? 16 : 24;
    const hpY = compact ? 58 : 24;
    const hpRatio = Phaser.Math.Clamp(snapshot.run.hp / snapshot.run.maxHp, 0, 1);
    const xpRatio = Phaser.Math.Clamp(snapshot.run.xp / snapshot.run.xpToNext, 0, 1);
    const hpBack = this.hudObjects[0] as Phaser.GameObjects.Rectangle;
    hpBack.setPosition(hpX, hpY);
    hpBack.width = hpBarWidth;
    this.hpFill.setPosition(hpX, hpY);
    this.hpFill.width = hpBarWidth * hpRatio;
    this.xpFill.setPosition(24, height - 28);
    this.xpFill.width = (width - 48) * xpRatio;

    this.xpBack.setPosition(24, height - 28);
    this.xpBack.width = width - 48;

    this.hpText.setText(`ОЗ ${Math.ceil(snapshot.run.hp)} / ${snapshot.run.maxHp}`);
    this.hpText.setPosition(hpX, hpY + 22);
    this.levelText.setText(`Уровень ${snapshot.run.level}`);
    this.levelText.setPosition(hpX, hpY + 46);
    this.timerText
      .setText(formatTimer(snapshot.run.timeElapsed))
      .setFontSize(compact ? 30 : 34)
      .setPosition(width / 2, compact ? 10 : 18)
      .setOrigin(0.5, 0);
    this.bonesText
      .setText(`Кости ${snapshot.run.bonesCollected}`)
      .setPosition(width - (compact ? 16 : 24), compact ? 58 : 24)
      .setOrigin(1, 0);
    this.killText
      .setText(`Убийства ${snapshot.run.kills}`)
      .setPosition(width - (compact ? 16 : 24), compact ? 84 : 50)
      .setOrigin(1, 0);

    const run = snapshot.run;
    const activeWeapons = run.upgrades.weapons.slice(0, 4);
    const weaponPanelWidth = compact ? Math.min(276, width - 32) : 276;
    const weaponPanelHeight = 14 + activeWeapons.length * 28;
    const weaponY = height - 42 - weaponPanelHeight;
    const weaponX = compact ? 16 : 24;

    this.weaponPanel.setPosition(weaponX, weaponY);
    this.weaponPanel.width = weaponPanelWidth;
    this.weaponPanel.height = weaponPanelHeight;

    this.weaponIcons.forEach((icon, index) => {
      const weaponId = activeWeapons[index];
      const text = this.weaponTexts[index];

      if (!weaponId) {
        icon.setVisible(false);
        text.setVisible(false);
        return;
      }

      const stats = getDerivedWeaponStats(run.upgrades, weaponId);
      icon.setVisible(true);
      text.setVisible(true);
      icon.setTexture(getWeaponIconTexture(weaponId));
      icon.setPosition(weaponX + 22, weaponY + 22 + index * 28);
      text
        .setText(formatWeaponHudLine(weaponId, stats))
        .setPosition(weaponX + 44, weaponY + 13 + index * 28);
    });

    const activeSynergyNames = getActiveSynergyNames(run.upgrades);
    const synergyVisible = activeSynergyNames.length > 0 && (snapshot.status === "playing" || snapshot.status === "paused");
    this.synergyPanel.setVisible(synergyVisible);
    this.synergyText.setVisible(synergyVisible);

    if (synergyVisible) {
      const synergyLines = formatSynergyHudLines(activeSynergyNames);
      const synergyPanelWidth = compact ? Math.min(320, width - 32) : 320;
      const synergyPanelHeight = 18 + synergyLines.length * 17;
      const synergyX = compact ? 16 : 24;
      const synergyY = Math.max(compact ? 130 : 94, weaponY - synergyPanelHeight - 8);

      this.synergyPanel.setPosition(synergyX, synergyY);
      this.synergyPanel.width = synergyPanelWidth;
      this.synergyPanel.height = synergyPanelHeight;
      this.synergyText
        .setText(["Синергии", ...synergyLines].join("\n"))
        .setPosition(synergyX + 10, synergyY + 7)
        .setWordWrapWidth(synergyPanelWidth - 20);
    }

    const bossVisible = Boolean(snapshot.finalBoss);
    this.bossHpBack.setVisible(bossVisible);
    this.bossHpFill.setVisible(bossVisible);
    this.bossHpText.setVisible(bossVisible);

    if (snapshot.finalBoss) {
      const bossBarWidth = compact ? Math.min(width - 48, 360) : 440;
      const bossRatio = Phaser.Math.Clamp(snapshot.finalBoss.hp / snapshot.finalBoss.maxHp, 0, 1);
      const bossY = compact ? 112 : 64;
      const bossX = width / 2 - bossBarWidth / 2;
      this.bossHpBack.setPosition(bossX, bossY);
      this.bossHpBack.width = bossBarWidth;
      this.bossHpFill.setPosition(bossX, bossY);
      this.bossHpFill.width = bossBarWidth * bossRatio;
      this.bossHpText
        .setText(`Капитан костяных рыцарей  ${Math.ceil(snapshot.finalBoss.hp)} / ${snapshot.finalBoss.maxHp}`)
        .setPosition(width / 2, bossY + 18)
        .setOrigin(0.5, 0);
    }

    this.updateBalanceDebugOverlay(snapshot, compact);
    this.layoutLowHpWarning(snapshot, width, height, compact);
  }

  private layoutLowHpWarning(snapshot: HudLayoutSnapshot, width: number, height: number, compact: boolean): void {
    const run = snapshot.run;

    if (snapshot.status !== "playing" || !run || !isLowHp(run.hp, run.maxHp)) {
      this.setLowHpWarningVisible(false);
      return;
    }

    const thickness = compact ? 24 : 32;
    const pulse = 0.2 + Math.sin(run.timeElapsed * 8.5) * 0.07;
    const [top, bottom, left, right] = this.lowHpEdges;
    top.setPosition(0, 0);
    top.width = width;
    top.height = thickness;
    bottom.setPosition(0, height - thickness);
    bottom.width = width;
    bottom.height = thickness;
    left.setPosition(0, 0);
    left.width = thickness;
    left.height = height;
    right.setPosition(width - thickness, 0);
    right.width = thickness;
    right.height = height;
    this.setLowHpWarningVisible(true, pulse);
  }

  private updateBalanceDebugOverlay(snapshot: HudLayoutSnapshot, compact: boolean): void {
    if (!this.balanceDebugText || !snapshot.run) {
      return;
    }

    const visible = snapshot.status === "playing" || snapshot.status === "paused";
    this.balanceDebugText.setVisible(visible);

    if (!visible) {
      return;
    }

    this.balanceDebugText
      .setText(
        [
          `FPS ${Math.round(snapshot.balanceDebug.fps)}`,
          `t ${formatTimer(snapshot.run.timeElapsed)}`,
          `kills ${snapshot.run.kills}`,
          `lvl ${snapshot.run.level}`,
          `speed ${Math.round(snapshot.balanceDebug.playerSpeed)}`,
          `hit cd ${snapshot.balanceDebug.hitCooldown.toFixed(2)}`,
          `en ${snapshot.balanceDebug.activeEnemies}`,
          `pr ${snapshot.balanceDebug.activeProjectiles}`,
          `xp ${snapshot.balanceDebug.activePickups}`,
          `budget ${snapshot.run.spawnBudget.toFixed(1)}`
        ].join("   ")
      )
      .setPosition(24, compact ? 132 : 98);
  }
}
