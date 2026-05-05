import type { RunEndSummary } from "../../domain/runSummary";
import type { SaveData } from "../../domain/save";
import {
  createRunStats,
  finalizeRunState,
  type RunStats
} from "./runState";
import type { RunStatus } from "./runStatus";

export type { RunStats };

export type RunStartState = {
  status: Extract<RunStatus, "playing">;
  run: RunStats;
  currentUpgradeOptions: [];
  runEndSummary: null;
  nextEnemyRuntimeId: 1;
  activeFinalBoss: null;
};

export type RunEndOverlay = "game_over" | "victory";

export type RunEndFlow = {
  status: Extract<RunStatus, "game_over" | "victory">;
  sfx: "death" | "victory";
  tintPlayerAsDead: boolean;
  overlay: RunEndOverlay;
};

export type CompletedRun = {
  status: Extract<RunStatus, "game_over" | "victory">;
  summary: RunEndSummary;
  saveData: SaveData;
  changed: boolean;
};

export function createRunStartState(saveData: SaveData): RunStartState {
  return {
    status: "playing",
    run: createRunStats(saveData.meta),
    currentUpgradeOptions: [],
    runEndSummary: null,
    nextEnemyRuntimeId: 1,
    activeFinalBoss: null
  };
}

export function createRunEndFlow(won: boolean): RunEndFlow {
  return won
    ? {
        status: "victory",
        sfx: "victory",
        tintPlayerAsDead: false,
        overlay: "victory"
      }
    : {
        status: "game_over",
        sfx: "death",
        tintPlayerAsDead: true,
        overlay: "game_over"
      };
}

export function completeRun(input: {
  run: RunStats;
  saveData: SaveData;
  won: boolean;
  existingSummary: RunEndSummary | null;
}): CompletedRun {
  const result = finalizeRunState(input);

  return {
    status: createRunEndFlow(input.won).status,
    summary: result.summary,
    saveData: result.saveData,
    changed: result.changed
  };
}
