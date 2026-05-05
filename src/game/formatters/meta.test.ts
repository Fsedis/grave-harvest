import { describe, expect, it } from "vitest";
import { formatMetaLevelText } from "./meta";

describe("formatMetaLevelText", () => {
  it("formats empty and active meta-upgrade levels", () => {
    expect(formatMetaLevelText("meta_hp", 0)).toBe("Сейчас: нет");
    expect(formatMetaLevelText("meta_hp", 2)).toBe("Сейчас: +20 ОЗ");
    expect(formatMetaLevelText("meta_damage", 2)).toBe("Сейчас: +10% урона");
    expect(formatMetaLevelText("meta_pickup", 2)).toBe("Сейчас: +20% подбора");
    expect(formatMetaLevelText("meta_rare", 2)).toBe("Сейчас: +2% редких карт");
    expect(formatMetaLevelText("meta_retention", 2)).toBe("Сейчас: +10% сохранения костей");
  });
});
