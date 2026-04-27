export type AudioChannel = "sfx" | "music";

export type AudioVolumeSettings = {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
};

export type AudioEvent =
  | "knife_shot"
  | "bell_pulse"
  | "crow_attack"
  | "enemy_hit"
  | "enemy_death"
  | "xp_pickup"
  | "bones_pickup"
  | "level_up"
  | "player_hit"
  | "boss_spawn"
  | "death"
  | "victory";

export function calculateChannelVolume(settings: AudioVolumeSettings, channel: AudioChannel): number {
  const channelVolume = channel === "sfx" ? settings.sfxVolume : settings.musicVolume;

  return clampVolume(settings.masterVolume) * clampVolume(channelVolume);
}

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}
