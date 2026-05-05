import Phaser from "phaser";
import {
  getDamageRadiusRingVisual,
  getDecorativeRingVisual,
  type RingVisual
} from "../../domain/effects";

export function createBurstFx(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  count: number,
  distance: number,
  duration: number
): void {
  for (let index = 0; index < count; index += 1) {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const travel = Phaser.Math.Between(Math.floor(distance * 0.45), distance);
    const particle = scene.add.circle(x, y, Phaser.Math.Between(2, 4), color, 0.88).setDepth(16);

    scene.tweens.add({
      targets: particle,
      x: x + Math.cos(angle) * travel,
      y: y + Math.sin(angle) * travel,
      alpha: 0,
      scale: 0.25,
      duration,
      ease: "Quad.easeOut",
      onComplete: () => particle.destroy()
    });
  }
}

export function createRingBurstFx(scene: Phaser.Scene, x: number, y: number, color: number, radius: number): void {
  createRingEffectFx(scene, x, y, color, getDecorativeRingVisual(radius));
}

export function createDamageRadiusRingFx(scene: Phaser.Scene, x: number, y: number, color: number, radius: number): void {
  createRingEffectFx(scene, x, y, color, getDamageRadiusRingVisual(radius));
}

export function createRingEffectFx(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  visual: RingVisual
): void {
  const ring = scene.add.circle(x, y, visual.radius, color, 0).setStrokeStyle(2, color, 0.82).setDepth(14);
  ring.setScale(visual.startScale);

  scene.tweens.add({
    targets: ring,
    alpha: 0,
    scale: visual.endScale,
    duration: visual.durationMs,
    ease: "Quad.easeOut",
    onComplete: () => ring.destroy()
  });
}

export function showWorldTextFx(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color: string,
  fontSize: number
): void {
  const label = scene.add
    .text(x, y, text, {
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: `${fontSize}px`,
      fontStyle: "700",
      color,
      stroke: "#15110d",
      strokeThickness: 4
    })
    .setOrigin(0.5)
    .setDepth(120);

  scene.tweens.add({
    targets: label,
    y: y - 36,
    alpha: 0,
    duration: 1200,
    ease: "Quad.easeOut",
    onComplete: () => label.destroy()
  });
}
