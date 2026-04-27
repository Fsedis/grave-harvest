export type HomingTargetCandidate = {
  id: number;
  active: boolean;
  distanceSq: number;
};

export function selectHomingTarget(
  currentTargetId: number | null,
  range: number,
  candidates: HomingTargetCandidate[]
): number | null {
  const rangeSq = range * range;
  const currentTarget = candidates.find(
    (candidate) =>
      candidate.id === currentTargetId && candidate.active && candidate.distanceSq <= rangeSq
  );

  if (currentTarget) {
    return currentTarget.id;
  }

  let nearest: HomingTargetCandidate | null = null;

  for (const candidate of candidates) {
    if (!candidate.active || candidate.distanceSq > rangeSq) {
      continue;
    }

    if (!nearest || candidate.distanceSq < nearest.distanceSq) {
      nearest = candidate;
    }
  }

  return nearest?.id ?? null;
}
