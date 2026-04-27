import { describe, expect, it } from "vitest";
import { calculateChannelVolume, type AudioVolumeSettings } from "./audio";

describe("calculateChannelVolume", () => {
  const settings: AudioVolumeSettings = {
    masterVolume: 0.8,
    sfxVolume: 0.5,
    musicVolume: 0.25
  };

  it("multiplies master volume by the requested SFX channel", () => {
    expect(calculateChannelVolume(settings, "sfx")).toBeCloseTo(0.4);
  });

  it("multiplies master volume by the requested music channel", () => {
    expect(calculateChannelVolume(settings, "music")).toBeCloseTo(0.2);
  });

  it("returns silence when master or channel volume is zero", () => {
    expect(calculateChannelVolume({ ...settings, masterVolume: 0 }, "sfx")).toBe(0);
    expect(calculateChannelVolume({ ...settings, musicVolume: 0 }, "music")).toBe(0);
  });
});
