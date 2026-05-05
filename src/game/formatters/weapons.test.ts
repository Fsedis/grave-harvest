import { describe, expect, it } from "vitest";
import { formatWeaponHudLine, formatWeaponName, getWeaponIconTexture } from "./weapons";

describe("weapon formatters", () => {
  it("formats weapon display names and icon texture keys", () => {
    expect(formatWeaponName("bone_knives")).toBe("Костяные ножи");
    expect(formatWeaponName("holy_candle")).toBe("Святая свеча");
    expect(formatWeaponName("grave_bell")).toBe("Могильный колокол");
    expect(formatWeaponName("crow_swarm")).toBe("Стая ворон");
    expect(getWeaponIconTexture("bone_knives")).toBe("weapon_bone_knives");
    expect(getWeaponIconTexture("holy_candle")).toBe("weapon_holy_candle");
    expect(getWeaponIconTexture("grave_bell")).toBe("weapon_grave_bell");
    expect(getWeaponIconTexture("crow_swarm")).toBe("weapon_crow_swarm");
  });

  it("formats weapon HUD lines from derived stats", () => {
    expect(formatWeaponHudLine("bone_knives", { cooldown: 0.84, projectileCount: 3, pulseCount: 1, radius: 550 })).toBe(
      "Костяные ножи  x3  0.8с"
    );
    expect(formatWeaponHudLine("holy_candle", { cooldown: 0.5, projectileCount: 1, pulseCount: 1, radius: 138 })).toBe(
      "Святая свеча  r138  0.5с"
    );
    expect(formatWeaponHudLine("grave_bell", { cooldown: 3.96, projectileCount: 1, pulseCount: 2, radius: 180 })).toBe(
      "Могильный колокол  x2  4.0с"
    );
    expect(formatWeaponHudLine("crow_swarm", { cooldown: 1.2, projectileCount: 4, pulseCount: 1, radius: 650 })).toBe(
      "Стая ворон  x4  1.2с"
    );
  });
});
