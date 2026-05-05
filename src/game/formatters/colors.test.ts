import { describe, expect, it } from "vitest";
import { colorToCss } from "./colors";

describe("colorToCss", () => {
  it("formats numeric Phaser colors as six-digit CSS hex values", () => {
    expect(colorToCss(0xf2c15c)).toBe("#f2c15c");
    expect(colorToCss(0x8f2620)).toBe("#8f2620");
    expect(colorToCss(0x000001)).toBe("#000001");
  });
});
