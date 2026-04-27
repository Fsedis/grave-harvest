export const SAVE_KEY = "grave_harvest_save_v1";

export type MetaUpgradeLevels = {
  meta_hp: number;
  meta_damage: number;
  meta_pickup: number;
  meta_rare: number;
  meta_retention: number;
};

export type SaveStats = {
  totalRuns: number;
  wins: number;
  bestTime: number;
  totalKills: number;
  totalBonesEarned: number;
};

export type SettingsData = {
  screenShake: boolean;
  damageNumbers: boolean;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
};

export type SaveData = {
  version: 1;
  bones: number;
  meta: MetaUpgradeLevels;
  stats: SaveStats;
  settings: SettingsData;
};

export type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

export function createDefaultSaveData(): SaveData {
  return {
    version: 1,
    bones: 0,
    meta: {
      meta_hp: 0,
      meta_damage: 0,
      meta_pickup: 0,
      meta_rare: 0,
      meta_retention: 0
    },
    stats: {
      totalRuns: 0,
      wins: 0,
      bestTime: 0,
      totalKills: 0,
      totalBonesEarned: 0
    },
    settings: createDefaultSettings()
  };
}

export function createDefaultSettings(): SettingsData {
  return {
    screenShake: true,
    damageNumbers: true,
    masterVolume: 0.8,
    sfxVolume: 0.75,
    musicVolume: 0.35
  };
}

export function loadSave(storage: StorageLike): SaveData {
  const rawSave = storage.getItem(SAVE_KEY);

  if (!rawSave) {
    return createDefaultSaveData();
  }

  try {
    return normalizeSaveData(JSON.parse(rawSave));
  } catch {
    return createDefaultSaveData();
  }
}

export function persistSave(storage: StorageLike, save: SaveData): void {
  storage.setItem(SAVE_KEY, JSON.stringify(normalizeSaveData(save)));
}

export function resetSave(storage: StorageLike): void {
  storage.removeItem(SAVE_KEY);
}

export function normalizeSettings(value: unknown): SettingsData {
  const defaults = createDefaultSettings();

  if (!isObject(value)) {
    return defaults;
  }

  return {
    screenShake: typeof value.screenShake === "boolean" ? value.screenShake : defaults.screenShake,
    damageNumbers: typeof value.damageNumbers === "boolean" ? value.damageNumbers : defaults.damageNumbers,
    masterVolume: normalizeVolume(value.masterVolume, defaults.masterVolume),
    sfxVolume: normalizeVolume(value.sfxVolume, defaults.sfxVolume),
    musicVolume: normalizeVolume(value.musicVolume, defaults.musicVolume)
  };
}

export function normalizeVolume(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(1, Math.max(0, value));
}

export function updateSettings(save: SaveData, patch: Partial<SettingsData>): SaveData {
  return {
    ...save,
    settings: normalizeSettings({
      ...save.settings,
      ...patch
    })
  };
}

function normalizeSaveData(value: unknown): SaveData {
  const defaults = createDefaultSaveData();

  if (!isObject(value) || value.version !== 1) {
    return defaults;
  }

  return {
    version: 1,
    bones: readNumber(value.bones, defaults.bones),
    meta: {
      meta_hp: readLevel(value.meta, "meta_hp"),
      meta_damage: readLevel(value.meta, "meta_damage"),
      meta_pickup: readLevel(value.meta, "meta_pickup"),
      meta_rare: readLevel(value.meta, "meta_rare"),
      meta_retention: readLevel(value.meta, "meta_retention")
    },
    stats: {
      totalRuns: readStat(value.stats, "totalRuns"),
      wins: readStat(value.stats, "wins"),
      bestTime: readStat(value.stats, "bestTime"),
      totalKills: readStat(value.stats, "totalKills"),
      totalBonesEarned: readStat(value.stats, "totalBonesEarned")
    },
    settings: normalizeSettings(value.settings)
  };
}

function readLevel(source: unknown, key: keyof MetaUpgradeLevels): number {
  if (!isObject(source)) {
    return 0;
  }

  return Math.max(0, Math.floor(readNumber(source[key], 0)));
}

function readStat(source: unknown, key: keyof SaveStats): number {
  if (!isObject(source)) {
    return 0;
  }

  return Math.max(0, Math.floor(readNumber(source[key], 0)));
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
