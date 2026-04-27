import { describe, expect, it } from "vitest";
import {
  SAVE_KEY,
  createDefaultSettings,
  createDefaultSaveData,
  loadSave,
  persistSave,
  resetSave,
  updateSettings,
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

  it("includes enabled feedback settings in default save data", () => {
    expect(createDefaultSaveData().settings).toEqual({
      screenShake: true,
      damageNumbers: true
    });
  });

  it("loads old saves without settings using default settings", () => {
    const storage = createMemoryStorage();
    storage.setItem(
      SAVE_KEY,
      JSON.stringify({
        version: 1,
        bones: 75,
        meta: {
          meta_hp: 1,
          meta_damage: 2,
          meta_pickup: 0,
          meta_rare: 0,
          meta_retention: 1
        },
        stats: {
          totalRuns: 3,
          wins: 1,
          bestTime: 420,
          totalKills: 180,
          totalBonesEarned: 75
        }
      })
    );

    expect(loadSave(storage).settings).toEqual(createDefaultSettings());
  });

  it("normalizes corrupt settings to defaults", () => {
    const storage = createMemoryStorage();
    storage.setItem(
      SAVE_KEY,
      JSON.stringify({
        ...createDefaultSaveData(),
        settings: {
          screenShake: "no",
          damageNumbers: null
        }
      })
    );

    expect(loadSave(storage).settings).toEqual(createDefaultSettings());
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

  it("updates settings without mutating the source save", () => {
    const save = createDefaultSaveData();
    const updated = updateSettings(save, { damageNumbers: false });

    expect(updated).toEqual({
      ...save,
      settings: {
        screenShake: true,
        damageNumbers: false
      }
    });
    expect(save.settings).toEqual(createDefaultSettings());
    expect(updated).not.toBe(save);
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
