import { ENEMY_DEFINITIONS, type EnemyDefinition } from "../data/enemies";

const BUDGET_CURVE = [
  { time: 0, budget: 1.5 },
  { time: 60, budget: 2.5 },
  { time: 120, budget: 3.5 },
  { time: 180, budget: 5 },
  { time: 240, budget: 6.5 },
  { time: 300, budget: 8 },
  { time: 360, budget: 10 },
  { time: 420, budget: 12 },
  { time: 480, budget: 15 },
  { time: 540, budget: 18 }
] as const;

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

function roundBudget(value: number): number {
  return Number(value.toFixed(3));
}
