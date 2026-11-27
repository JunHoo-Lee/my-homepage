/*
 * STUB — replaced by the real procedural WebAudio engine.
 * Contract: see AudioEngine in ./contracts.ts.
 */
import type { AudioEngine, AudioSettings, MusicMode, SfxName, SfxOptions } from "./contracts";

export const SFX_NAMES: SfxName[] = [
  "shoot", "hit", "crit", "kill", "explode", "gem", "levelup", "pick", "hover", "click", "hurt", "heartbeat", "beam",
  "shock", "boomerang", "anchor", "orb", "zap", "bossWarn", "bossShot", "bossHit", "bossDie", "revive", "heal", "magnet",
  "combo", "talk", "stamp",
];

/**
 * Schedule one sound effect into any audio context (also an OfflineAudioContext,
 * which tests use to render and measure sounds). Returns its duration in seconds.
 */
export function renderSfx(_ctx: BaseAudioContext, _dest: AudioNode, _name: SfxName, _when: number, _opts?: SfxOptions): number {
  return 0;
}

export function createAudio(initial?: Partial<AudioSettings>): AudioEngine {
  let settings: AudioSettings = { muted: false, music: 0.5, sfx: 0.7, ...initial };
  let mode: MusicMode = "off";
  void mode;
  return {
    unlock() {},
    get unlocked() {
      return false;
    },
    sfx() {},
    setMusic(next) {
      mode = next;
    },
    setIntensity() {},
    setSettings(next) {
      settings = { ...settings, ...next };
    },
    getSettings() {
      return settings;
    },
    suspend() {},
    resume() {},
    dispose() {},
  };
}
