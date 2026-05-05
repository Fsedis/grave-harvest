import { describe, expect, it } from "vitest";
import { formatTimer } from "./time";

describe("formatTimer", () => {
  it("formats elapsed seconds as mm:ss", () => {
    expect(formatTimer(0)).toBe("00:00");
    expect(formatTimer(65.8)).toBe("01:05");
    expect(formatTimer(600)).toBe("10:00");
  });
});
