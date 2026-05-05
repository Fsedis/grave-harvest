export type RunStatus =
  | "menu"
  | "playing"
  | "paused"
  | "level_up"
  | "game_over"
  | "victory"
  | "meta_upgrades"
  | "settings"
  | "reset_confirm";

export type SettingsReturnTarget = "menu" | "pause";
