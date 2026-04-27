import { describe, expect, it } from "vitest";
import {
  SAVE_KEY,
  createDefaultSaveData,
  loadSave,
  persistSave,
  resetSave,
  type SaveData,
  type StorageLike
} from "./save";

describe("save system", () => {
  it("returns default save data when storage is empty", () => {
    expect(loadSave(createMemoryStorage())).toEqual(createDefaultSaveData());
  });

  it("returns default save data when stored JSON is corrupt", () => {
    const storage = createMemoryStorage();
    storage.setItem(SAVE_KEY, "{not-json");

    expect(loadSave(storage)).toEqual(createDefaultSaveData());
  });

  it("persists and loads save data roundtrip", () => {
    const storage = createMemoryStorage();
    const save: SaveData = {
      ...createDefaultSaveData(),
      bones: 123,
      meta: {
        meta_hp: 2,
        meta_damage: 1,
        meta_pickup: 0,
        meta_rare: 3,
        meta_retention: 1
      },
      stats: {
        totalRuns: 4,
        wins: 1,
        bestTime: 601,
        totalKills: 250,
        totalBonesEarned: 123
      }
    };

    persistSave(storage, save);

    expect(loadSave(storage)).toEqual(save);
  });

  it("removes persisted progress on reset", () => {
    const storage = createMemoryStorage();
    persistSave(storage, { ...createDefaultSaveData(), bones: 50 });

    resetSave(storage);

    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });
});

function createMemoryStorage(): StorageLike {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };
}
