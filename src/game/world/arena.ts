import Phaser from "phaser";

export function createGraveyardArena(scene: Phaser.Scene, mapSize: number): void {
  scene.physics.world.setBounds(0, 0, mapSize, mapSize);
  scene.cameras.main.setBounds(0, 0, mapSize, mapSize);

  scene.add.rectangle(mapSize / 2, mapSize / 2, mapSize, mapSize, 0x121711).setDepth(-30);

  const ground = scene.add.graphics().setDepth(-25);
  ground.fillStyle(0x171d15, 1);
  ground.fillRect(0, 0, mapSize, mapSize);
  ground.fillStyle(0x202018, 0.45);
  for (let index = 0; index < 42; index += 1) {
    const x = 70 + ((index * 211) % (mapSize - 140));
    const y = 80 + ((index * 157) % (mapSize - 160));
    ground.fillEllipse(x, y, 210 + (index % 5) * 34, 90 + (index % 4) * 22);
  }
  ground.fillStyle(0x0e130f, 0.26);
  for (let index = 0; index < 34; index += 1) {
    const x = 120 + ((index * 277) % (mapSize - 240));
    const y = 120 + ((index * 193) % (mapSize - 240));
    ground.fillEllipse(x, y, 140 + (index % 4) * 28, 60 + (index % 3) * 18);
  }

  const paths = scene.add.graphics().setDepth(-22);
  paths.fillStyle(0x27231c, 0.72);
  paths.fillRoundedRect(170, mapSize / 2 - 70, mapSize - 340, 140, 58);
  paths.fillRoundedRect(mapSize / 2 - 78, 190, 156, mapSize - 380, 62);
  paths.fillStyle(0x3a3024, 0.28);
  for (let index = 0; index < 38; index += 1) {
    const x = 220 + ((index * 149) % (mapSize - 440));
    const y = mapSize / 2 - 42 + ((index * 37) % 84);
    paths.fillEllipse(x, y, 34, 14);
  }
  for (let index = 0; index < 34; index += 1) {
    const x = mapSize / 2 - 48 + ((index * 41) % 96);
    const y = 230 + ((index * 137) % (mapSize - 460));
    paths.fillEllipse(x, y, 28, 16);
  }

  const grid = scene.add.graphics().setDepth(-10);
  grid.lineStyle(1, 0x2a3329, 0.18);
  for (let position = 0; position <= mapSize; position += 120) {
    grid.lineBetween(position, 0, position, mapSize);
    grid.lineBetween(0, position, mapSize, position);
  }

  const decor = scene.add.graphics().setDepth(-5);
  for (let index = 0; index < 68; index += 1) {
    const x = 120 + ((index * 173) % (mapSize - 240));
    const y = 120 + ((index * 251) % (mapSize - 240));
    const variant = index % 4;
    decor.fillStyle(0x070908, 0.36);
    decor.fillEllipse(x + 13, y + 28, 44, 18);

    if (variant === 0) {
      decor.fillStyle(0x32382f, 1);
      decor.fillRoundedRect(x, y, 24, 38, 4);
      decor.fillStyle(0x1f251f, 0.8);
      decor.fillRect(x + 5, y + 9, 14, 3);
    } else if (variant === 1) {
      decor.fillStyle(0x3a3b34, 1);
      decor.fillRoundedRect(x - 2, y + 4, 28, 30, 3);
      decor.fillRect(x + 8, y - 8, 8, 14);
      decor.fillRect(x + 2, y - 2, 20, 6);
    } else if (variant === 2) {
      decor.fillStyle(0x272e28, 1);
      decor.fillRoundedRect(x - 4, y + 10, 34, 18, 5);
      decor.fillStyle(0x111611, 0.5);
      decor.fillRect(x, y + 16, 26, 3);
    } else {
      decor.fillStyle(0x30352f, 1);
      decor.fillRoundedRect(x + 2, y + 2, 20, 34, 10);
      decor.fillStyle(0x485044, 0.75);
      decor.fillCircle(x + 12, y + 11, 4);
    }
  }

  const trees = scene.add.graphics().setDepth(-6);
  for (let index = 0; index < 18; index += 1) {
    const x = 160 + ((index * 307) % (mapSize - 320));
    const y = 170 + ((index * 419) % (mapSize - 340));
    trees.lineStyle(5, 0x1c1814, 0.9);
    trees.lineBetween(x, y, x + 8, y - 42);
    trees.lineStyle(3, 0x1c1814, 0.82);
    trees.lineBetween(x + 5, y - 28, x - 15, y - 52);
    trees.lineBetween(x + 7, y - 32, x + 28, y - 58);
    trees.fillStyle(0x080a08, 0.32);
    trees.fillEllipse(x + 8, y + 3, 46, 16);
  }

  const border = scene.add.graphics().setDepth(-4);
  border.lineStyle(22, 0x2e271f, 1);
  border.strokeRect(8, 8, mapSize - 16, mapSize - 16);
  border.lineStyle(4, 0x514334, 0.9);
  border.strokeRect(28, 28, mapSize - 56, mapSize - 56);
  border.fillStyle(0x1c1712, 1);
  for (let position = 64; position < mapSize - 64; position += 96) {
    border.fillRect(position, 4, 12, 40);
    border.fillRect(position, mapSize - 44, 12, 40);
    border.fillRect(4, position, 40, 12);
    border.fillRect(mapSize - 44, position, 40, 12);
  }

  const fog = scene.add.graphics().setDepth(-3);
  fog.fillStyle(0x9aa091, 0.06);
  fog.fillRect(0, 0, mapSize, 90);
  fog.fillRect(0, mapSize - 90, mapSize, 90);
  fog.fillRect(0, 0, 90, mapSize);
  fog.fillRect(mapSize - 90, 0, 90, mapSize);
}
