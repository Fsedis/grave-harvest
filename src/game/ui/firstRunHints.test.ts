import { describe, expect, it } from "vitest";
import { createDefaultSaveData } from "../../domain/save";
import { FIRST_RUN_HINTS, consumeFirstRunHints } from "./firstRunHints";

describe("first-run hints", () => {
  it("marks unseen hints as seen and returns the scheduled messages", () => {
    const saveData = createDefaultSaveData();

    const result = consumeFirstRunHints(saveData);

    expect(result.shouldPersist).toBe(true);
    expect(result.messages).toEqual(FIRST_RUN_HINTS);
    expect(result.saveData.tutorial.firstRunHintsSeen).toBe(true);
    expect(saveData.tutorial.firstRunHintsSeen).toBe(false);
  });

  it("does not reschedule hints after they were seen", () => {
    const seen = consumeFirstRunHints(createDefaultSaveData()).saveData;

    const result = consumeFirstRunHints(seen);

    expect(result.shouldPersist).toBe(false);
    expect(result.messages).toEqual([]);
    expect(result.saveData).toBe(seen);
  });
});
