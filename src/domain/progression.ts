export type RetentionInput = {
  collected: number;
  timeElapsed: number;
  won: boolean;
  retentionBonus?: number;
};

export function xpRequired(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));

  return Math.floor(8 + safeLevel * 6 + safeLevel ** 2 * 0.8);
}

export function calculateRetainedBones({
  collected,
  timeElapsed,
  won,
  retentionBonus = 0
}: RetentionInput): number {
  if (collected <= 0) {
    return 0;
  }

  if (won) {
    return Math.floor(collected);
  }

  const baseRetention = getDeathRetention(timeElapsed);
  const retention = Math.min(1, baseRetention + retentionBonus);

  return Math.floor(collected * retention);
}

export function getDeathRetention(timeElapsed: number): number {
  if (timeElapsed < 180) {
    return 0.4;
  }

  if (timeElapsed < 420) {
    return 0.6;
  }

  return 0.75;
}
