import { describe, expect, it } from "vitest";
import { createInitialUpgradeState } from "./upgrades";
import { createDefaultSaveData } from "./save";
import {
  applyMetaToUpgradeState,
  canBuyMetaUpgrade,
  getMetaRetentionBonus,
  getMetaUpgradeCost,
  purchaseMetaUpgrade
} from "./metaProgression";

describe("meta progression", () => {
  it("uses the MVP cost formula", () => {
    expect(getMetaUpgradeCost("meta_hp", 0)).toBe(40);
    expect(getMetaUpgradeCost("meta_hp", 1)).toBe(101);
    expect(getMetaUpgradeCost("meta_damage", 2)).toBe(220);
  });

  it("blocks purchases without enough bones or at max level", () => {
    const save = createDefaultSaveData();
    save.bones = 39;

    expect(canBuyMetaUpgrade(save, "meta_hp")).toBe(false);

    save.bones = 1000;
    save.meta.meta_hp = 5;

    expect(canBuyMetaUpgrade(save, "meta_hp")).toBe(false);
  });

  it("purchases an upgrade by subtracting bones and increasing level", () => {
    const save = createDefaultSaveData();
    save.bones = 150;

    const result = purchaseMetaUpgrade(save, "meta_hp");

    expect(result.purchased).toBe(true);
    expect(result.save.bones).toBe(110);
    expect(result.save.meta.meta_hp).toBe(1);
    expect(save.meta.meta_hp).toBe(0);
  });

  it("applies meta upgrades to run upgrade state", () => {
    const save = createDefaultSaveData();
    save.meta = {
      meta_hp: 2,
      meta_damage: 3,
      meta_pickup: 2,
      meta_rare: 4,
      meta_retention: 1
    };
    const state = createInitialUpgradeState();

    applyMetaToUpgradeState(state, save.meta);

    expect(state.maxHp).toBe(120);
    expect(state.damageMultiplier).toBeCloseTo(1.15);
    expect(state.pickupRadius).toBeCloseTo(84);
    expect(state.rareChanceBonus).toBeCloseTo(0.04);
    expect(getMetaRetentionBonus(save.meta)).toBeCloseTo(0.05);
  });
});
