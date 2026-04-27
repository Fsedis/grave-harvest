export type EnemyBehavior = "chase" | "zigzag" | "dash";

export type EnemyDefinition = {
  id: string;
  name: string;
  hp: number;
  speed: number;
  damage: number;
  xpDrop: number;
  bonesDropChance: number;
  bonesMin: number;
  bonesMax: number;
  radius: number;
  knockbackResistance: number;
  behavior: EnemyBehavior;
  spawnCost: number;
  firstAppearsAt: number;
  color: number;
};

export const ENEMY_DEFINITIONS: EnemyDefinition[] = [
  {
    id: "skeleton",
    name: "Skeleton",
    hp: 12,
    speed: 95,
    damage: 8,
    xpDrop: 1,
    bonesDropChance: 0.03,
    bonesMin: 1,
    bonesMax: 1,
    radius: 14,
    knockbackResistance: 0,
    behavior: "chase",
    spawnCost: 1,
    firstAppearsAt: 0,
    color: 0xd6d0b8
  },
  {
    id: "grave_rat",
    name: "Grave Rat",
    hp: 8,
    speed: 155,
    damage: 5,
    xpDrop: 1,
    bonesDropChance: 0.02,
    bonesMin: 1,
    bonesMax: 1,
    radius: 10,
    knockbackResistance: 0,
    behavior: "chase",
    spawnCost: 1,
    firstAppearsAt: 60,
    color: 0x8d7460
  },
  {
    id: "rot_walker",
    name: "Rot Walker",
    hp: 45,
    speed: 65,
    damage: 14,
    xpDrop: 3,
    bonesDropChance: 0.07,
    bonesMin: 1,
    bonesMax: 2,
    radius: 20,
    knockbackResistance: 0.2,
    behavior: "chase",
    spawnCost: 3,
    firstAppearsAt: 120,
    color: 0x6f8c5c
  },
  {
    id: "ghost",
    name: "Ghost",
    hp: 22,
    speed: 115,
    damage: 10,
    xpDrop: 4,
    bonesDropChance: 0.05,
    bonesMin: 1,
    bonesMax: 2,
    radius: 16,
    knockbackResistance: 0.65,
    behavior: "zigzag",
    spawnCost: 4,
    firstAppearsAt: 240,
    color: 0xa8e7ff
  },
  {
    id: "bone_knight",
    name: "Bone Knight",
    hp: 350,
    speed: 85,
    damage: 20,
    xpDrop: 25,
    bonesDropChance: 1,
    bonesMin: 15,
    bonesMax: 25,
    radius: 28,
    knockbackResistance: 0.8,
    behavior: "dash",
    spawnCost: Number.POSITIVE_INFINITY,
    firstAppearsAt: 300,
    color: 0xb7b1a3
  }
];

export function getEnemyDefinition(id: string): EnemyDefinition {
  const enemy = ENEMY_DEFINITIONS.find((definition) => definition.id === id);

  if (!enemy) {
    throw new Error(`Unknown enemy definition: ${id}`);
  }

  return enemy;
}
