import type { HomingTargetCandidate } from "../../domain/homing";

export type CombatTarget = {
  runtimeId: number;
  active: boolean;
  x: number;
  y: number;
};

export type Point = {
  x: number;
  y: number;
};

export function findNearestTarget<T extends CombatTarget>(
  targets: Iterable<T>,
  origin: Point,
  range: number
): T | null {
  let nearest: T | null = null;
  let nearestDistanceSq = range * range;

  for (const target of targets) {
    if (!target.active) {
      continue;
    }

    const distanceSq = getDistanceSq(origin, target);

    if (distanceSq <= nearestDistanceSq) {
      nearest = target;
      nearestDistanceSq = distanceSq;
    }
  }

  return nearest;
}

export function findRandomTarget<T extends CombatTarget>(
  targets: Iterable<T>,
  origin: Point,
  range: number,
  pickIndex: (maxInclusive: number) => number
): T | null {
  const candidates: T[] = [];
  const rangeSq = range * range;

  for (const target of targets) {
    if (!target.active) {
      continue;
    }

    if (getDistanceSq(origin, target) <= rangeSq) {
      candidates.push(target);
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  return candidates[pickIndex(candidates.length - 1)];
}

export function findTargetByRuntimeId<T extends CombatTarget>(
  targets: Iterable<T>,
  runtimeId: number
): T | null {
  for (const target of targets) {
    if (target.active && target.runtimeId === runtimeId) {
      return target;
    }
  }

  return null;
}

export function getHomingCandidatesFromTargets(
  targets: Iterable<CombatTarget>,
  origin: Point
): HomingTargetCandidate[] {
  return Array.from(targets, (target) => ({
    id: target.runtimeId,
    active: target.active,
    distanceSq: getDistanceSq(origin, target)
  }));
}

function getDistanceSq(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;

  return dx * dx + dy * dy;
}
