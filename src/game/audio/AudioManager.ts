import {
  calculateChannelVolume,
  type AudioEvent,
  type AudioVolumeSettings
} from "../../domain/audio";

type ToneOptions = {
  frequency: number;
  endFrequency?: number;
  duration: number;
  volume: number;
  type?: OscillatorType;
};

type NoiseOptions = {
  duration: number;
  volume: number;
  lowpass?: number;
};

const EVENT_THROTTLE_MS: Partial<Record<AudioEvent, number>> = {
  knife_shot: 42,
  crow_attack: 70,
  enemy_hit: 48,
  enemy_death: 36,
  xp_pickup: 28,
  bones_pickup: 55
};

export class AudioManager {
  private context: AudioContext | null = null;
  private settings: AudioVolumeSettings;
  private musicPlaying = false;
  private musicStepIndex = 0;
  private musicStepTimer: number | null = null;
  private musicPulseTimer: number | null = null;
  private lastPlayedAt: Partial<Record<AudioEvent, number>> = {};

  constructor(settings: AudioVolumeSettings) {
    this.settings = settings;
  }

  updateSettings(settings: AudioVolumeSettings): void {
    this.settings = settings;
  }

  async unlock(): Promise<void> {
    const context = this.getContext();

    if (!context || context.state !== "suspended") {
      return;
    }

    await context.resume();
  }

  playSfx(event: AudioEvent): void {
    if (!this.canPlayEvent(event)) {
      return;
    }

    const volume = calculateChannelVolume(this.settings, "sfx");

    if (volume <= 0) {
      return;
    }

    const context = this.getContext();

    if (!context) {
      return;
    }

    if (context.state === "suspended") {
      void context.resume();
    }

    this.playEvent(event, volume);
  }

  startRunMusic(): void {
    if (this.musicPlaying) {
      return;
    }

    const volume = calculateChannelVolume(this.settings, "music");

    if (volume <= 0) {
      return;
    }

    const context = this.getContext();

    if (!context) {
      return;
    }

    if (context.state === "suspended") {
      void context.resume();
    }

    this.musicPlaying = true;
    this.musicStepIndex = 0;
    this.playMusicStep();

    if (typeof window !== "undefined") {
      this.musicStepTimer = window.setInterval(() => this.playMusicStep(), 520);
      this.musicPulseTimer = window.setInterval(() => this.playMusicBellPhrase(), 8320);
    }
  }

  stopRunMusic(): void {
    this.musicPlaying = false;
    this.clearMusicStepTimer();
    this.clearMusicPulseTimer();
  }

  destroy(): void {
    this.stopRunMusic();
    void this.context?.close();
    this.context = null;
  }

  private getContext(): AudioContext | null {
    if (this.context) {
      return this.context;
    }

    const AudioContextConstructor =
      globalThis.AudioContext ??
      (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextConstructor) {
      return null;
    }

    this.context = new AudioContextConstructor();

    return this.context;
  }

  private canPlayEvent(event: AudioEvent): boolean {
    const throttle = EVENT_THROTTLE_MS[event];

    if (!throttle) {
      return true;
    }

    const now = performance.now();
    const lastPlayedAt = this.lastPlayedAt[event] ?? Number.NEGATIVE_INFINITY;

    if (now - lastPlayedAt < throttle) {
      return false;
    }

    this.lastPlayedAt[event] = now;

    return true;
  }

  private playEvent(event: AudioEvent, volume: number): void {
    if (event === "knife_shot") {
      this.playTone({ frequency: 760, endFrequency: 1060, duration: 0.055, volume: volume * 0.2, type: "triangle" });
    } else if (event === "bell_pulse") {
      this.playTone({ frequency: 155, endFrequency: 76, duration: 0.58, volume: volume * 0.5, type: "sine" });
    } else if (event === "crow_attack") {
      this.playTone({ frequency: 520, endFrequency: 310, duration: 0.12, volume: volume * 0.18, type: "sawtooth" });
      this.playNoise({ duration: 0.08, volume: volume * 0.08, lowpass: 1200 });
    } else if (event === "enemy_hit") {
      this.playNoise({ duration: 0.045, volume: volume * 0.12, lowpass: 900 });
    } else if (event === "enemy_death") {
      this.playNoise({ duration: 0.11, volume: volume * 0.2, lowpass: 720 });
      this.playTone({ frequency: 120, endFrequency: 70, duration: 0.12, volume: volume * 0.12, type: "square" });
    } else if (event === "xp_pickup") {
      this.playTone({ frequency: 820, endFrequency: 1180, duration: 0.09, volume: volume * 0.16, type: "sine" });
    } else if (event === "bones_pickup") {
      this.playTone({ frequency: 360, endFrequency: 260, duration: 0.065, volume: volume * 0.18, type: "square" });
      this.playTone({ frequency: 560, endFrequency: 420, duration: 0.045, volume: volume * 0.08, type: "triangle" });
    } else if (event === "level_up") {
      this.playLevelUp(volume);
    } else if (event === "player_hit") {
      this.playNoise({ duration: 0.16, volume: volume * 0.26, lowpass: 520 });
      this.playTone({ frequency: 150, endFrequency: 60, duration: 0.22, volume: volume * 0.2, type: "sawtooth" });
    } else if (event === "boss_spawn") {
      this.playTone({ frequency: 120, endFrequency: 54, duration: 1.05, volume: volume * 0.58, type: "sine" });
      this.playNoise({ duration: 0.34, volume: volume * 0.18, lowpass: 650 });
    } else if (event === "death") {
      this.playTone({ frequency: 180, endFrequency: 42, duration: 0.9, volume: volume * 0.42, type: "sawtooth" });
    } else if (event === "victory") {
      this.playVictory(volume);
    }
  }

  private playTone(options: ToneOptions): void {
    const context = this.context;

    if (!context || options.volume <= 0) {
      return;
    }

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = options.type ?? "sine";
    oscillator.frequency.setValueAtTime(options.frequency, now);

    if (options.endFrequency !== undefined) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, options.endFrequency), now + options.duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(options.volume, now + Math.min(0.025, options.duration * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + options.duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + options.duration + 0.03);
  }

  private playNoise(options: NoiseOptions): void {
    const context = this.context;

    if (!context || options.volume <= 0) {
      return;
    }

    const now = context.currentTime;
    const sampleCount = Math.max(1, Math.floor(context.sampleRate * options.duration));
    const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < sampleCount; index += 1) {
      data[index] = Math.random() * 2 - 1;
    }

    const source = context.createBufferSource();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    source.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(options.lowpass ?? 1000, now);
    gain.gain.setValueAtTime(options.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + options.duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    source.start(now);
  }

  private playLevelUp(volume: number): void {
    const context = this.context;

    if (!context) {
      return;
    }

    [620, 830, 1240].forEach((frequency, index) => {
      window.setTimeout(() => {
        this.playTone({ frequency, endFrequency: frequency * 1.08, duration: 0.16, volume: volume * 0.22, type: "triangle" });
      }, index * 70);
    });
  }

  private playVictory(volume: number): void {
    [220, 330, 440, 660].forEach((frequency, index) => {
      window.setTimeout(() => {
        this.playTone({ frequency, endFrequency: frequency * 1.03, duration: 0.22, volume: volume * 0.2, type: "triangle" });
      }, index * 95);
    });
  }

  private playMusicStep(): void {
    const volume = calculateChannelVolume(this.settings, "music");

    if (!this.musicPlaying || volume <= 0) {
      return;
    }

    const bassPattern = [55, 0, 65.41, 0, 73.42, 65.41, 0, 49];
    const note = bassPattern[this.musicStepIndex % bassPattern.length];

    if (note > 0) {
      this.playTone({
        frequency: note,
        endFrequency: note * 0.72,
        duration: 0.18,
        volume: volume * 0.14,
        type: "triangle"
      });
    }

    if (this.musicStepIndex % 8 === 4) {
      this.playTone({
        frequency: 196,
        endFrequency: 185,
        duration: 0.32,
        volume: volume * 0.055,
        type: "sine"
      });
    }

    this.musicStepIndex += 1;
  }

  private playMusicBellPhrase(): void {
    if (!this.musicPlaying || typeof window === "undefined") {
      return;
    }

    const notes = [220, 196, 246.94, 174.61];
    notes.forEach((frequency, index) => {
      window.setTimeout(() => {
        if (!this.musicPlaying) {
          return;
        }

        const volume = calculateChannelVolume(this.settings, "music");
        this.playTone({
          frequency,
          endFrequency: frequency * 0.98,
          duration: 0.42,
          volume: volume * 0.075,
          type: "sine"
        });
      }, index * 190);
    });
  }

  private clearMusicStepTimer(): void {
    if (this.musicStepTimer === null) {
      return;
    }

    window.clearInterval(this.musicStepTimer);
    this.musicStepTimer = null;
  }

  private clearMusicPulseTimer(): void {
    if (this.musicPulseTimer === null) {
      return;
    }

    window.clearInterval(this.musicPulseTimer);
    this.musicPulseTimer = null;
  }
}
