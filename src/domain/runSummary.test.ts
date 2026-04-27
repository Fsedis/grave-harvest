import { describe, expect, it } from "vitest";
import { createDefaultSaveData } from "./save";
import { applyRunEndSummaryToSave, createRunEndSummary } from "./runSummary";

describe("createRunEndSummary", () => {
  it("adds survival bonus before death retention", () => {
    const summary = createRunEndSummary({
      droppedBones: 10,
      timeElapsed: 320,
      won: false,
      retentionBonus: 0
    });

    expect(summary.survivalBonus).toBe(15);
    expect(summary.victoryBonus).toBe(0);
    expect(summary.grossBones).toBe(25);
    expect(summary.retainedBones).toBe(15);
  });

  it("adds victory bonus and keeps all gross bones on victory", () => {
    const summary = createRunEndSummary({
      droppedBones: 20,
      timeElapsed: 620,
      won: true,
      retentionBonus: 0
    });

    expect(summary.survivalBonus).toBe(15);
    expect(summary.victoryBonus).toBe(50);
    expect(summary.grossBones).toBe(85);
    expect(summary.retainedBones).toBe(85);
  });

  it("uses meta retention bonus on death", () => {
    const summary = createRunEndSummary({
      droppedBones: 25,
      timeElapsed: 240,
      won: false,
      retentionBonus: 0.05
    });

    expect(summary.retainedBones).toBe(16);
  });
});

describe("applyRunEndSummaryToSave", () => {
  it("adds retained bones and updates run stats once", () => {
    const save = createDefaultSaveData();
    save.bones = 10;
    const summary = createRunEndSummary({
      droppedBones: 20,
      timeElapsed: 620,
      won: true,
      retentionBonus: 0
    });

    const nextSave = applyRunEndSummaryToSave(save, summary, {
      kills: 300,
      level: 18
    });

    expect(nextSave.bones).toBe(95);
    expect(nextSave.stats.totalRuns).toBe(1);
    expect(nextSave.stats.wins).toBe(1);
    expect(nextSave.stats.bestTime).toBe(620);
    expect(nextSave.stats.totalKills).toBe(300);
    expect(nextSave.stats.totalBonesEarned).toBe(85);
    expect(save.bones).toBe(10);
  });
});
