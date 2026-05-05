import { describe, expect, it } from "vitest";
import { formatSynergyHudLines } from "./synergies";

describe("formatSynergyHudLines", () => {
  it("shows up to three synergy names without extra decoration", () => {
    expect(formatSynergyHudLines(["Пламенные ножи", "Воронья панихида"])).toEqual([
      "Пламенные ножи",
      "Воронья панихида"
    ]);
  });

  it("collapses additional synergy names into a counter", () => {
    expect(formatSynergyHudLines(["A", "B", "C", "D", "E"])).toEqual(["A", "B", "C", "+2"]);
  });
});
