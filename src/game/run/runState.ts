import {
  applyMetaToUpgradeState,
  getMetaRetentionBonus
} from "../../domain/metaProgression";
import { xpRequired } from "../../domain/progression";
import {
  applyRunEndSummaryToSave,
  createRunEndSummary,
  type RunEndSummary
} from "../../domain/runSummary";
import type { SaveData } from "../../domain/save";
import {
  createInitialUpgradeState,
  type UpgradeState
} from "../../domain/upgrades";

export type RunStats = {
  hp: number;
  level: number;
  xp: number;
  xpToNext: number;
  timeElapsed: number;
  kills: number;
  bonesCollected: number;
  spawnBudget: number;
  weaponCooldowns: Record<string, number>;
  invulnerableUntil: number;
  finalBossKilled: boolean;
  upgrades: UpgradeState;
};

export type FinalizedRunState = {
  summary: RunEndSummary;
  saveData: SaveData;
  changed: boolean;
};

export function createRunStats(meta: SaveData["meta"]): RunStats {
  const upgradeState = createInitialUpgradeState();
  applyMetaToUpgradeState(upgradeState, meta);

  return {
    hp: upgradeState.maxHp,
    level: 1,
    xp: 0,
    xpToNext: xpRequired(1),
    timeElapsed: 0,
    kills: 0,
    bonesCollected: 0,
    spawnBudget: 0,
    weaponCooldowns: {
      bone_knives: 0.35
    },
    invulnerableUntil: 0,
    finalBossKilled: false,
    upgrades: upgradeState
  };
}

export function finalizeRunState(input: {
  run: RunStats;
  saveData: SaveData;
  won: boolean;
  existingSummary: RunEndSummary | null;
}): FinalizedRunState {
  if (input.existingSummary) {
    return {
      summary: input.existingSummary,
      saveData: input.saveData,
      changed: false
    };
  }

  const summary = createRunEndSummary({
    droppedBones: input.run.bonesCollected,
    timeElapsed: input.run.timeElapsed,
    won: input.won,
    retentionBonus: getMetaRetentionBonus(input.saveData.meta)
  });
  const saveData = applyRunEndSummaryToSave(input.saveData, summary, {
    kills: input.run.kills,
    level: input.run.level
  });

  return {
    summary,
    saveData,
    changed: true
  };
}
