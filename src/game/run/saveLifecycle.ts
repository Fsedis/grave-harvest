import {
  createDefaultSaveData,
  loadSave,
  persistSave,
  resetSave,
  type SaveData,
  type StorageLike
} from "../../domain/save";

export class GameSaveStore {
  constructor(private readonly storage: StorageLike | null) {}

  load(): SaveData {
    return this.storage ? loadSave(this.storage) : createDefaultSaveData();
  }

  persist(saveData: SaveData): boolean {
    if (!this.storage) {
      return false;
    }

    persistSave(this.storage, saveData);
    return true;
  }

  reset(): SaveData {
    if (this.storage) {
      resetSave(this.storage);
    }

    return createDefaultSaveData();
  }
}

export function createBrowserSaveStore(): GameSaveStore {
  if (typeof globalThis.localStorage === "undefined") {
    return new GameSaveStore(null);
  }

  return new GameSaveStore(globalThis.localStorage);
}
