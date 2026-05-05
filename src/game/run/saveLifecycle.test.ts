import { describe, expect, it } from "vitest";
import { SAVE_KEY, createDefaultSaveData, type SaveData, type StorageLike } from "../../domain/save";
import { GameSaveStore } from "./saveLifecycle";

describe("GameSaveStore", () => {
  it("loads default save data when browser storage is unavailable", () => {
    const store = new GameSaveStore(null);

    expect(store.load()).toEqual(createDefaultSaveData());
  });

  it("persists save data when storage exists", () => {
    const storage = createMemoryStorage();
    const store = new GameSaveStore(storage);
    const save: SaveData = {
      ...createDefaultSaveData(),
      bones: 42
    };

    expect(store.persist(save)).toBe(true);
    expect(JSON.parse(storage.getItem(SAVE_KEY) ?? "{}")).toMatchObject({ bones: 42 });
  });

  it("reports skipped persistence when storage is unavailable", () => {
    const store = new GameSaveStore(null);

    expect(store.persist(createDefaultSaveData())).toBe(false);
  });

  it("resets persisted progress and returns fresh save data", () => {
    const storage = createMemoryStorage();
    const store = new GameSaveStore(storage);
    store.persist({ ...createDefaultSaveData(), bones: 99 });

    expect(store.reset()).toEqual(createDefaultSaveData());
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
