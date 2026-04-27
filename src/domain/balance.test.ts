import { describe, expect, it } from "vitest";
import {
  getBalanceDebugEnabled,
  isWithinBalanceRange,
  MVP_BALANCE_TARGETS
} from "./balance";

describe("MVP balance targets", () => {
  it("defines the first MVP balance pass ranges", () => {
    expect(MVP_BALANCE_TARGETS.firstLossSeconds).toEqual({ min: 240, max: 420 });
    expect(MVP_BALANCE_TARGETS.fullRunKills).toEqual({ min: 800, max: 1200 });
    expect(MVP_BALANCE_TARGETS.fullRunLevel).toEqual({ min: 23, max: 28 });
    expect(MVP_BALANCE_TARGETS.captainKillSeconds).toEqual({ min: 20, max: 45 });
  });

  it("checks inclusive numeric target ranges", () => {
    expect(isWithinBalanceRange(800, MVP_BALANCE_TARGETS.fullRunKills)).toBe(true);
    expect(isWithinBalanceRange(1200, MVP_BALANCE_TARGETS.fullRunKills)).toBe(true);
    expect(isWithinBalanceRange(799, MVP_BALANCE_TARGETS.fullRunKills)).toBe(false);
    expect(isWithinBalanceRange(1201, MVP_BALANCE_TARGETS.fullRunKills)).toBe(false);
  });
});

describe("getBalanceDebugEnabled", () => {
  it("enables the balance debug overlay only for the explicit query flag", () => {
    expect(getBalanceDebugEnabled("?debug=balance")).toBe(true);
    expect(getBalanceDebugEnabled("debug=balance")).toBe(true);
    expect(getBalanceDebugEnabled("?debug=perf")).toBe(false);
    expect(getBalanceDebugEnabled("?debug=balance-extra")).toBe(false);
    expect(getBalanceDebugEnabled("")).toBe(false);
  });
});
