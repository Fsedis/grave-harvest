export type PickupType = "xp" | "bones";

export type PickupMergeCandidate = {
  id: string;
  type: PickupType;
  x: number;
  y: number;
  value: number;
};

export type PickupMergeInput = {
  type: PickupType;
  x: number;
  y: number;
  candidates: PickupMergeCandidate[];
  localRadius?: number;
};

const DEFAULT_LOCAL_MERGE_RADIUS = 120;

export function selectPickupMergeTarget(input: PickupMergeInput): PickupMergeCandidate | null {
  const sameTypeCandidates = input.candidates.filter((candidate) => candidate.type === input.type);

  if (sameTypeCandidates.length === 0) {
    return null;
  }

  const localRadius = input.localRadius ?? DEFAULT_LOCAL_MERGE_RADIUS;
  const localRadiusSq = localRadius * localRadius;
  const withDistance = sameTypeCandidates.map((candidate) => ({
    candidate,
    distanceSq: getDistanceSq(input.x, input.y, candidate.x, candidate.y)
  }));
  const localCandidates = withDistance.filter((candidate) => candidate.distanceSq <= localRadiusSq);
  const source = localCandidates.length > 0 ? localCandidates : withDistance;

  return source.reduce((nearest, current) =>
    current.distanceSq < nearest.distanceSq ? current : nearest
  ).candidate;
}

function getDistanceSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;

  return dx * dx + dy * dy;
}
