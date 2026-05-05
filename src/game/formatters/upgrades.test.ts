import { describe, expect, it } from "vitest";
import { formatUpgradeCardLabel, getUpgradeCardColor } from "./upgrades";

describe("upgrade card formatters", () => {
  it("labels synergy cards before rarity labels", () => {
    expect(formatUpgradeCardLabel({ category: "synergy", rarity: "rare" })).toBe("СИНЕРГИЯ");
    expect(getUpgradeCardColor({ category: "synergy", rarity: "rare" })).toBe(0xf2c15c);
  });

  it("formats regular rarity labels and colors", () => {
    expect(formatUpgradeCardLabel({ rarity: "rare" })).toBe("РЕДКОЕ");
    expect(formatUpgradeCardLabel({ rarity: "uncommon" })).toBe("НЕОБЫЧНОЕ");
    expect(formatUpgradeCardLabel({ rarity: "common" })).toBe("ОБЫЧНОЕ");
    expect(getUpgradeCardColor({ rarity: "rare" })).toBe(0xd89cff);
    expect(getUpgradeCardColor({ rarity: "uncommon" })).toBe(0x7ed6ff);
    expect(getUpgradeCardColor({ rarity: "common" })).toBe(0xd8d0bd);
  });
});
