export type OverlayObjectList = Phaser.GameObjects.GameObject[];

export function addOverlayRectangle(
  scene: Phaser.Scene,
  overlayObjects: OverlayObjectList,
  x: number,
  y: number,
  width: number,
  height: number,
  color: number,
  alpha: number
): Phaser.GameObjects.Rectangle {
  const rect = scene.add
    .rectangle(x, y, width, height, color, alpha)
    .setScrollFactor(0)
    .setDepth(2000);
  overlayObjects.push(rect);
  return rect;
}

export function addOverlayText(
  scene: Phaser.Scene,
  overlayObjects: OverlayObjectList,
  x: number,
  y: number,
  text: string,
  fontSize: number,
  color: string,
  fontStyle = "400"
): Phaser.GameObjects.Text {
  const label = scene.add
    .text(x, y, text, {
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: `${fontSize}px`,
      fontStyle,
      color,
      align: "center"
    })
    .setScrollFactor(0)
    .setDepth(2001);
  overlayObjects.push(label);
  return label;
}

export function addOverlayButton(
  scene: Phaser.Scene,
  overlayObjects: OverlayObjectList,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  onClick: () => void,
  enabled = true
): void {
  const rect = addOverlayRectangle(scene, overlayObjects, x, y, width, height, enabled ? 0xc9b46a : 0x4b4438, 1);
  rect.setStrokeStyle(2, enabled ? 0x4a3921 : 0x2c2d28, 1);

  if (enabled) {
    rect.setInteractive({ useHandCursor: true });
    rect.on("pointerover", () => rect.setFillStyle(0xe1cd7d, 1));
    rect.on("pointerout", () => rect.setFillStyle(0xc9b46a, 1));
    rect.on("pointerdown", onClick);
  }

  addOverlayText(scene, overlayObjects, x, y, label, 20, enabled ? "#17140f" : "#9a917e", "700").setOrigin(0.5);
}

export function addMiniSettingsButton(
  scene: Phaser.Scene,
  overlayObjects: OverlayObjectList,
  x: number,
  y: number,
  label: string,
  onClick: () => void
): void {
  const button = addOverlayRectangle(scene, overlayObjects, x, y, 36, 32, 0xc9b46a, 1);
  button.setStrokeStyle(2, 0x4a3921, 1);
  button.setInteractive({ useHandCursor: true });
  button.on("pointerover", () => button.setFillStyle(0xe1cd7d, 1));
  button.on("pointerout", () => button.setFillStyle(0xc9b46a, 1));
  button.on("pointerdown", onClick);
  addOverlayText(scene, overlayObjects, x, y - 1, label, 20, "#17140f", "700").setOrigin(0.5);
}

export function clearOverlayObjects(overlayObjects: OverlayObjectList): void {
  overlayObjects.forEach((object) => object.destroy());
}
