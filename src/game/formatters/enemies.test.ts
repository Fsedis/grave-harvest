import { describe, expect, it } from "vitest";
import { getDeathBurstColor, getEnemyDisplaySize, getEnemyTexture } from "./enemies";

describe("enemy formatters", () => {
  it("maps enemy ids to texture keys and death colors", () => {
    expect(getEnemyTexture("skeleton")).toBe("enemy_skeleton");
    expect(getEnemyTexture("grave_rat")).toBe("enemy_grave_rat");
    expect(getEnemyTexture("rot_walker")).toBe("enemy_rot_walker");
    expect(getEnemyTexture("ghost")).toBe("enemy_ghost");
    expect(getEnemyTexture("bone_knight")).toBe("enemy_bone_knight");
    expect(getEnemyTexture("unknown")).toBe("enemy");
    expect(getDeathBurstColor("grave_rat")).toBe(0x9b4635);
    expect(getDeathBurstColor("rot_walker")).toBe(0x6f8c5c);
    expect(getDeathBurstColor("ghost")).toBe(0x8fdfff);
    expect(getDeathBurstColor("skeleton")).toBe(0x8f2620);
  });

  it("formats enemy display sizes from radius", () => {
    expect(getEnemyDisplaySize({ id: "grave_rat", radius: 10 })).toEqual({ width: 30, height: 18 });
    expect(getEnemyDisplaySize({ id: "rot_walker", radius: 20 })).toEqual({ width: 45, height: 51 });
    expect(getEnemyDisplaySize({ id: "ghost", radius: 16 })).toEqual({ width: 36, height: 42.4 });
    expect(getEnemyDisplaySize({ id: "bone_knight", radius: 28 })).toEqual({ width: 61.60000000000001, height: 71.39999999999999 });
    expect(getEnemyDisplaySize({ id: "skeleton", radius: 14 })).toEqual({ width: 28, height: 32.9 });
  });
});
