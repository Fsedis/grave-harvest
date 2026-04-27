export type RingVisual = {
  radius: number;
  startScale: number;
  endScale: number;
  durationMs: number;
};

export function getDamageRadiusRingVisual(radius: number): RingVisual {
  return {
    radius,
    startScale: 0.35,
    endScale: 1,
    durationMs: 180
  };
}

export function getDecorativeRingVisual(radius: number): RingVisual {
  return {
    radius,
    startScale: 1,
    endScale: 2.2,
    durationMs: 220
  };
}
