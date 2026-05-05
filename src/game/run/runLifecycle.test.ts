import { describe, expect, it } from "vitest";
import { createDefaultSaveData } from "../../domain/save";
import {
  completeRun,
  createRunEndFlow,
  createRunStartState
} from "./runLifecycle";

describe("run lifecycle", () => {
  it("creates a fresh playing run state from save meta", () => {
    const saveData = createDefaultSaveData();
    saveData.meta.meta_hp = 2;

    const start = createRunStartState(saveData);

    expect(start.status).toBe("playing");
    expect(start.currentUpgradeOptions).toEqual([]);
    expect(start.runEndSummary).toBeNull();
    expect(start.nextEnemyRuntimeId).toBe(1);
    expect(start.activeFinalBoss).toBeNull();
    expect(start.run.hp).toBe(start.run.upgrades.maxHp);
    expect(start.run.upgrades.maxHp).toBeGreaterThan(createRunStartState(createDefaultSaveData()).run.upgrades.maxHp);
  });

  it("describes death and victory end flows without scene dependencies", () => {
    expect(createRunEndFlow(false)).toEqual({
      status: "game_over",
      sfx: "death",
      tintPlayerAsDead: true,
      overlay: "game_over"
    });
    expect(createRunEndFlow(true)).toEqual({
      status: "victory",
      sfx: "victory",
      tintPlayerAsDead: false,
      overlay: "victory"
    });
  });

  it("finalizes a run once and reports when save persistence is needed", () => {
    const saveData = createDefaultSaveData();
    const run = createRunStartState(saveData).run;
    run.bonesCollected = 20;
    run.kills = 7;
    run.level = 3;
    run.timeElapsed = 620;

    const result = completeRun({
      run,
      saveData,
      won: true,
      existingSummary: null
    });

    expect(result.status).toBe("victory");
    expect(result.changed).toBe(true);
    expect(result.summary).toMatchObject({
      droppedBones: 20,
      victoryBonus: 50,
      retainedBones: 85,
      won: true
    });
    expect(result.saveData.stats).toMatchObject({
      totalRuns: 1,
      wins: 1,
      bestTime: 620,
      totalKills: 7,
      totalBonesEarned: 85
    });

    const repeated = completeRun({
      run,
      saveData: result.saveData,
      won: true,
      existingSummary: result.summary
    });

    expect(repeated.changed).toBe(false);
    expect(repeated.summary).toBe(result.summary);
    expect(repeated.saveData).toBe(result.saveData);
  });
});
