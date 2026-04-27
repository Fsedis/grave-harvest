import { ENEMY_DEFINITIONS, type EnemyDefinition } from "../data/enemies";
import { xpRequired } from "./progression";

const BUDGET_CURVE = [
  { time: 0, budget: 1.8 },
  { time: 30, budget: 2.8 },
  { time: 60, budget: 4.2 },
  { time: 90, budget: 5.5 },
  { time: 120, budget: 7 },
  { time: 180, budget: 8.8 },
  { time: 240, budget: 10.5 },
  { time: 300, budget: 12 },
  { time: 360, budget: 13.5 },
  { time: 420, budget: 15 },
  { time: 480, budget: 17 },
  { time: 540, budget: 19 },
  { time: 600, budget: 20 }
] as const;

export const ENEMY_SPAWN_CAPS = {
  soft: 180,
  hard: 260
} as const;

export type ScriptedEnemySpawn = {
  id: string;
  enemyId: string;
  name: string;
  time: number;
  hpMultiplier: number;
  scaleMultiplier: number;
  color: number;
};

const SCRIPTED_ENEMY_SPAWNS: ScriptedEnemySpawn[] = [
  {
    id: "bone_knight_elite",
    enemyId: "bone_knight",
    name: "Костяной рыцарь",
    time: 300,
    hpMultiplier: 1,
    scaleMultiplier: 1,
    color: 0xb7b1a3
  },
  {
    id: "bone_knight_captain",
    enemyId: "bone_knight",
    name: "Капитан костяных рыцарей",
    time: 600,
    hpMultiplier: 2.2,
    scaleMultiplier: 1.22,
    color: 0xd1c07d
  }
];

export function getSpawnBudgetPerSecond(timeElapsed: number): number {
  if (timeElapsed <= BUDGET_CURVE[0].time) {
    return BUDGET_CURVE[0].budget;
  }

  for (let index = 0; index < BUDGET_CURVE.length - 1; index += 1) {
    const current = BUDGET_CURVE[index];
    const next = BUDGET_CURVE[index + 1];

    if (timeElapsed <= next.time) {
      const progress = (timeElapsed - current.time) / (next.time - current.time);
      return roundBudget(current.budget + (next.budget - current.budget) * progress);
    }
  }

  return BUDGET_CURVE[BUDGET_CURVE.length - 1].budget;
}

export function getAllowedEnemies(timeElapsed: number): EnemyDefinition[] {
  return ENEMY_DEFINITIONS.filter(
    (enemy) => enemy.firstAppearsAt <= timeElapsed && Number.isFinite(enemy.spawnCost)
  );
}

export function getScriptedEnemySpawns(previousTime: number, currentTime: number): ScriptedEnemySpawn[] {
  if (currentTime <= previousTime) {
    return [];
  }

  return SCRIPTED_ENEMY_SPAWNS.filter((spawn) => previousTime < spawn.time && spawn.time <= currentTime);
}

export function pickEnemyForBudget(
  availableBudget: number,
  timeElapsed: number,
  rng: () => number = Math.random
): EnemyDefinition | null {
  const candidates = getAllowedEnemies(timeElapsed).filter(
    (enemy) => enemy.spawnCost <= availableBudget
  );

  if (candidates.length === 0) {
    return null;
  }

  const index = Math.min(candidates.length - 1, Math.floor(rng() * candidates.length));

  return candidates[index];
}

export function getSpawnPressureMultiplier(
  activeEnemies: number,
  caps = ENEMY_SPAWN_CAPS
): number {
  if (activeEnemies >= caps.hard) {
    return 0;
  }

  if (activeEnemies > caps.soft) {
    return 0.5;
  }

  return 1;
}

export type EarlyGamePacingEstimate = {
  seconds: number;
  generatedBudget: number;
  estimatedCollectableXp: number;
  levelUps: number;
};

export function estimateEarlyGamePacing(seconds: number): EarlyGamePacingEstimate {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const generatedBudget = estimateGeneratedBudget(safeSeconds);

  const estimatedCollectableXp = Math.floor(generatedBudget * 0.14);

  return {
    seconds: safeSeconds,
    generatedBudget: roundBudget(generatedBudget),
    estimatedCollectableXp,
    levelUps: estimateLevelUps(estimatedCollectableXp)
  };
}

export type NightPressureTier = "early" | "rising" | "dense" | "panic" | "final";

export type NightPacingEstimate = {
  seconds: number;
  generatedBudget: number;
  estimatedCollectableXp: number;
  estimatedKills: {
    min: number;
    max: number;
  };
  estimatedLevel: number;
  levelUps: number;
  pressureTier: NightPressureTier;
};

export function estimateNightPacing(seconds: number): NightPacingEstimate {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const generatedBudget = estimateGeneratedBudget(safeSeconds);
  const estimatedCollectableXp = Math.floor(generatedBudget * 0.75);
  const minKills = roundToNearest(generatedBudget / 8.8, 50);
  const maxKills = Math.max(minKills, roundToNearest(generatedBudget / 5.9, 50));
  const levelUps = estimateLevelUps(estimatedCollectableXp);

  return {
    seconds: safeSeconds,
    generatedBudget: roundBudget(generatedBudget),
    estimatedCollectableXp,
    estimatedKills: {
      min: minKills,
      max: maxKills
    },
    estimatedLevel: 1 + levelUps,
    levelUps,
    pressureTier: getNightPressureTier(safeSeconds)
  };
}

function estimateGeneratedBudget(seconds: number): number {
  let generatedBudget = 0;

  for (let elapsed = 0; elapsed < seconds; elapsed += 1) {
    generatedBudget += getSpawnBudgetPerSecond(elapsed);
  }

  return generatedBudget;
}

function estimateLevelUps(estimatedCollectableXp: number): number {
  let remainingXp = estimatedCollectableXp;
  let nextLevel = 1;
  let levelUps = 0;

  while (remainingXp >= xpRequired(nextLevel)) {
    remainingXp -= xpRequired(nextLevel);
    nextLevel += 1;
    levelUps += 1;
  }

  return levelUps;
}

function getNightPressureTier(seconds: number): NightPressureTier {
  if (seconds >= 600) {
    return "final";
  }

  if (seconds >= 480) {
    return "panic";
  }

  if (seconds >= 300) {
    return "dense";
  }

  if (seconds >= 120) {
    return "rising";
  }

  return "early";
}

function roundToNearest(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function roundBudget(value: number): number {
  return Number(value.toFixed(3));
}
