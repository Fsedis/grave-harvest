import { describe, expect, it } from "vitest";
import { roundVolume } from "./volume";

describe("roundVolume", () => {
  it("rounds to one decimal and clamps to the settings range", () => {
    expect(roundVolume(0.24)).toBe(0.2);
    expect(roundVolume(0.25)).toBe(0.3);
    expect(roundVolume(-0.1)).toBe(0);
    expect(roundVolume(1.1)).toBe(1);
  });
});
