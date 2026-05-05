export function roundVolume(value: number): number {
  return Math.min(1, Math.max(0, Math.round(value * 10) / 10));
}
