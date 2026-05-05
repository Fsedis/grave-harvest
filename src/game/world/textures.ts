import Phaser from "phaser";

export function createGameTextures(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics();

  graphics.fillStyle(0xe8dfc6, 1);
  graphics.fillCircle(18, 18, 16);
  graphics.lineStyle(3, 0x2b241f, 1);
  graphics.strokeCircle(18, 18, 16);
  graphics.generateTexture("player", 36, 36);
  graphics.clear();

  graphics.fillStyle(0xffffff, 1);
  graphics.fillCircle(16, 9, 7);
  graphics.fillRoundedRect(11, 16, 10, 15, 3);
  graphics.lineStyle(2, 0x101010, 1);
  graphics.lineBetween(8, 20, 24, 20);
  graphics.lineBetween(12, 31, 8, 35);
  graphics.lineBetween(20, 31, 24, 35);
  graphics.generateTexture("enemy_skeleton", 32, 38);
  graphics.clear();

  graphics.fillStyle(0xffffff, 1);
  graphics.fillEllipse(18, 11, 30, 15);
  graphics.fillCircle(31, 9, 5);
  graphics.lineStyle(2, 0xffffff, 1);
  graphics.lineBetween(4, 12, 0, 17);
  graphics.generateTexture("enemy_grave_rat", 38, 24);
  graphics.clear();

  graphics.fillStyle(0xffffff, 1);
  graphics.fillRoundedRect(7, 7, 34, 38, 8);
  graphics.fillCircle(24, 9, 12);
  graphics.lineStyle(3, 0x101010, 1);
  graphics.lineBetween(13, 25, 35, 25);
  graphics.generateTexture("enemy_rot_walker", 48, 52);
  graphics.clear();

  graphics.fillStyle(0xffffff, 0.82);
  graphics.fillCircle(20, 16, 16);
  graphics.fillTriangle(5, 20, 35, 20, 20, 43);
  graphics.fillStyle(0x101010, 0.55);
  graphics.fillCircle(14, 15, 3);
  graphics.fillCircle(26, 15, 3);
  graphics.generateTexture("enemy_ghost", 40, 46);
  graphics.clear();

  graphics.fillStyle(0xffffff, 1);
  graphics.fillRoundedRect(6, 11, 40, 45, 8);
  graphics.fillCircle(26, 13, 14);
  graphics.fillStyle(0x101010, 0.9);
  graphics.fillRect(14, 12, 24, 5);
  graphics.generateTexture("enemy_bone_knight", 54, 62);
  graphics.clear();

  graphics.fillStyle(0xffffff, 1);
  graphics.fillCircle(18, 18, 16);
  graphics.lineStyle(2, 0x101010, 1);
  graphics.strokeCircle(18, 18, 16);
  graphics.generateTexture("enemy", 36, 36);
  graphics.clear();

  graphics.fillStyle(0xf2ead0, 1);
  graphics.fillTriangle(5, 2, 30, 8, 5, 14);
  graphics.lineStyle(1, 0x1a1714, 1);
  graphics.strokeTriangle(5, 2, 30, 8, 5, 14);
  graphics.generateTexture("knife", 34, 16);
  graphics.clear();

  graphics.fillStyle(0xf2ead0, 1);
  graphics.fillTriangle(4, 4, 28, 11, 4, 18);
  graphics.lineStyle(2, 0x201810, 1);
  graphics.strokeTriangle(4, 4, 28, 11, 4, 18);
  graphics.generateTexture("weapon_bone_knives", 32, 22);
  graphics.clear();

  graphics.fillStyle(0xf7d779, 1);
  graphics.fillRoundedRect(12, 5, 8, 21, 3);
  graphics.fillStyle(0xfff0a8, 1);
  graphics.fillCircle(16, 5, 5);
  graphics.lineStyle(2, 0x513619, 1);
  graphics.strokeRoundedRect(12, 5, 8, 21, 3);
  graphics.generateTexture("weapon_holy_candle", 32, 32);
  graphics.clear();

  graphics.lineStyle(4, 0xd1c3a4, 1);
  graphics.strokeCircle(16, 16, 10);
  graphics.lineStyle(3, 0x5c4a35, 1);
  graphics.lineBetween(16, 6, 16, 2);
  graphics.lineBetween(8, 10, 4, 6);
  graphics.generateTexture("weapon_grave_bell", 32, 32);
  graphics.clear();

  graphics.fillStyle(0x20242a, 1);
  graphics.fillTriangle(5, 17, 17, 8, 14, 19);
  graphics.fillTriangle(14, 19, 24, 8, 27, 18);
  graphics.fillCircle(16, 17, 4);
  graphics.lineStyle(1, 0xa9b2c1, 1);
  graphics.strokeCircle(16, 17, 4);
  graphics.generateTexture("weapon_crow_swarm", 32, 32);
  graphics.clear();

  graphics.fillStyle(0x1d2229, 1);
  graphics.fillTriangle(2, 10, 16, 2, 13, 13);
  graphics.fillTriangle(13, 13, 27, 3, 30, 13);
  graphics.fillCircle(16, 13, 4);
  graphics.lineStyle(1, 0xa7b3c5, 0.8);
  graphics.strokeCircle(16, 13, 4);
  graphics.generateTexture("crow", 32, 20);
  graphics.clear();

  graphics.fillStyle(0x69d7ff, 1);
  graphics.fillCircle(8, 8, 6);
  graphics.lineStyle(2, 0xd8f7ff, 0.9);
  graphics.strokeCircle(8, 8, 6);
  graphics.generateTexture("xp", 16, 16);
  graphics.clear();

  graphics.fillStyle(0xe6d1a3, 1);
  graphics.fillCircle(8, 8, 5);
  graphics.lineStyle(2, 0x8a6a35, 1);
  graphics.strokeCircle(8, 8, 5);
  graphics.generateTexture("bones", 16, 16);
  graphics.destroy();
}
