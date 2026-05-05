import { describe, expect, it } from "vitest";
import { createDefaultSaveData } from "../../domain/save";
import {
  applyMetaUpgradePurchase,
  applySettingsPatch,
  getSettingsCloseStatus
} from "./settingsFlow";

describe("settings and meta flow", () => {
  it("updates settings and requests damage number cleanup only when disabling them", () => {
    const saveData = createDefaultSaveData();

    const disabled = applySettingsPatch(saveData, { damageNumbers: false });
    expect(disabled.saveData.settings.damageNumbers).toBe(false);
    expect(disabled.shouldClearDamageNumbers).toBe(true);
    expect(disabled.shouldPersist).toBe(true);

    const volumeOnly = applySettingsPatch(disabled.saveData, { musicVolume: 0.9 });
    expect(volumeOnly.saveData.settings.musicVolume).toBe(0.9);
    expect(volumeOnly.shouldClearDamageNumbers).toBe(false);
    expect(volumeOnly.shouldPersist).toBe(true);
  });

  it("maps settings close target back to the owning screen status", () => {
    expect(getSettingsCloseStatus("pause")).toBe("paused");
    expect(getSettingsCloseStatus("menu")).toBe("menu");
  });

  it("purchases meta upgrades only when affordable", () => {
    const saveData = {
      ...createDefaultSaveData(),
      bones: 50
    };

    const purchased = applyMetaUpgradePurchase(saveData, "meta_hp");
    expect(purchased.purchased).toBe(true);
    expect(purchased.shouldPersist).toBe(true);
    expect(purchased.saveData.meta.meta_hp).toBe(1);
    expect(purchased.saveData.bones).toBeLessThan(saveData.bones);

    const rejected = applyMetaUpgradePurchase(createDefaultSaveData(), "meta_hp");
    expect(rejected.purchased).toBe(false);
    expect(rejected.shouldPersist).toBe(false);
    expect(rejected.saveData.meta.meta_hp).toBe(0);
  });
});
