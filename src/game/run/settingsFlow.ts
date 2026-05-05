import {
  purchaseMetaUpgrade,
  type MetaUpgradeId
} from "../../domain/metaProgression";
import {
  updateSettings,
  type SaveData,
  type SettingsData
} from "../../domain/save";
import type {
  RunStatus,
  SettingsReturnTarget
} from "./runStatus";

export type SettingsPatchResult = {
  saveData: SaveData;
  shouldPersist: true;
  shouldClearDamageNumbers: boolean;
};

export type MetaUpgradePurchaseResult = {
  saveData: SaveData;
  purchased: boolean;
  shouldPersist: boolean;
};

export function applySettingsPatch(
  saveData: SaveData,
  patch: Partial<SettingsData>
): SettingsPatchResult {
  const hadDamageNumbers = saveData.settings.damageNumbers;
  const updatedSaveData = updateSettings(saveData, patch);

  return {
    saveData: updatedSaveData,
    shouldPersist: true,
    shouldClearDamageNumbers: hadDamageNumbers && !updatedSaveData.settings.damageNumbers
  };
}

export function getSettingsCloseStatus(
  returnTarget: SettingsReturnTarget
): Extract<RunStatus, "menu" | "paused"> {
  return returnTarget === "pause" ? "paused" : "menu";
}

export function applyMetaUpgradePurchase(
  saveData: SaveData,
  id: MetaUpgradeId
): MetaUpgradePurchaseResult {
  const result = purchaseMetaUpgrade(saveData, id);

  return {
    saveData: result.save,
    purchased: result.purchased,
    shouldPersist: result.purchased
  };
}
