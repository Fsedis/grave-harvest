export const FINAL_BOSS_TIME_SECONDS = 600;

export type NightVictoryState = {
  timeElapsed: number;
  finalBossKilled: boolean;
};

export function hasWonNight(state: NightVictoryState): boolean {
  return state.timeElapsed >= FINAL_BOSS_TIME_SECONDS && state.finalBossKilled;
}
