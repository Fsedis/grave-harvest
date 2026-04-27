import { calculateRetainedBones } from "./progression";
import type { SaveData } from "./save";

export type RunEndSummaryInput = {
  droppedBones: number;
  timeElapsed: number;
  won: boolean;
  retentionBonus: number;
};

export type RunEndSummary = {
  droppedBones: number;
  survivalBonus: number;
  victoryBonus: number;
  grossBones: number;
  retainedBones: number;
  timeElapsed: number;
  won: boolean;
};

export type RunEndStatsInput = {
  kills: number;
  level: number;
};

export function createRunEndSummary(input: RunEndSummaryInput): RunEndSummary {
  const droppedBones = Math.max(0, Math.floor(input.droppedBones));
  const survivalBonus = input.timeElapsed >= 300 ? 15 : 0;
  const victoryBonus = input.won ? 50 : 0;
  const grossBones = droppedBones + survivalBonus + victoryBonus;
  const retainedBones = calculateRetainedBones({
    collected: grossBones,
    timeElapsed: input.timeElapsed,
    won: input.won,
    retentionBonus: input.retentionBonus
  });

  return {
    droppedBones,
    survivalBonus,
    victoryBonus,
    grossBones,
    retainedBones,
    timeElapsed: input.timeElapsed,
    won: input.won
  };
}

export function applyRunEndSummaryToSave(
  save: SaveData,
  summary: RunEndSummary,
  stats: RunEndStatsInput
): SaveData {
  return {
    ...save,
    bones: save.bones + summary.retainedBones,
    stats: {
      totalRuns: save.stats.totalRuns + 1,
      wins: save.stats.wins + (summary.won ? 1 : 0),
      bestTime: Math.max(save.stats.bestTime, summary.timeElapsed),
      totalKills: save.stats.totalKills + Math.max(0, Math.floor(stats.kills)),
      totalBonesEarned: save.stats.totalBonesEarned + summary.retainedBones
    }
  };
}
