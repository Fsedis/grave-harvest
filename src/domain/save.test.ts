import { describe, expect, it } from "vitest";
import {
  SAVE_KEY,
  createDefaultSettings,
  createDefaultSaveData,
  createDefaultTutorialState,
  loadSave,
  markFirstRunHintsSeen,
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
      damageNumbers: true,
      masterVolume: 0.8,
      sfxVolume: 0.75,
      musicVolume: 0.35
    });
  });

  it("includes unseen first-run hints in default save data", () => {
    expect(createDefaultSaveData().tutorial).toEqual({
      firstRunHintsSeen: false
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
    expect(loadSave(storage).tutorial).toEqual(createDefaultTutorialState());
  });

  it("normalizes corrupt settings to defaults", () => {
    const storage = createMemoryStorage();
    storage.setItem(
      SAVE_KEY,
      JSON.stringify({
        ...createDefaultSaveData(),
        settings: {
          screenShake: "no",
          damageNumbers: null,
          masterVolume: "loud",
          sfxVolume: Number.NaN,
          musicVolume: undefined
        }
      })
    );

    expect(loadSave(storage).settings).toEqual(createDefaultSettings());
  });

  it("normalizes corrupt tutorial state to defaults", () => {
    const storage = createMemoryStorage();
    storage.setItem(
      SAVE_KEY,
      JSON.stringify({
        ...createDefaultSaveData(),
        tutorial: {
          firstRunHintsSeen: "yes"
        }
      })
    );

    expect(loadSave(storage).tutorial).toEqual(createDefaultTutorialState());
  });

  it("clamps numeric volume settings to the valid range", () => {
    const storage = createMemoryStorage();
    storage.setItem(
      SAVE_KEY,
      JSON.stringify({
        ...createDefaultSaveData(),
        settings: {
          screenShake: false,
          damageNumbers: true,
          masterVolume: 1.4,
          sfxVolume: -0.2,
          musicVolume: 0.5
        }
      })
    );

    expect(loadSave(storage).settings).toEqual({
      screenShake: false,
      damageNumbers: true,
      masterVolume: 1,
      sfxVolume: 0,
      musicVolume: 0.5
    });
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
        damageNumbers: false,
        masterVolume: 0.8,
        sfxVolume: 0.75,
        musicVolume: 0.35
      }
    });
    expect(save.settings).toEqual(createDefaultSettings());
    expect(updated).not.toBe(save);
  });

  it("updates volume settings without mutating the source save", () => {
    const save = createDefaultSaveData();
    const updated = updateSettings(save, { masterVolume: 0.4, musicVolume: 0.9 });

    expect(updated.settings).toEqual({
      ...createDefaultSettings(),
      masterVolume: 0.4,
      musicVolume: 0.9
    });
    expect(save.settings).toEqual(createDefaultSettings());
  });

  it("marks first-run hints as seen without mutating the source save", () => {
    const save = createDefaultSaveData();
    const updated = markFirstRunHintsSeen(save);

    expect(updated.tutorial).toEqual({ firstRunHintsSeen: true });
    expect(save.tutorial).toEqual(createDefaultTutorialState());
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
