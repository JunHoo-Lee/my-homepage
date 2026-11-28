/*
 * A very small WebAudio synth shared by the paper games (/play/dsf and
 * /play/backdoor). Everything is generated, there are no audio files.
 *
 * Browsers only start an AudioContext inside a user gesture, so the UI calls
 * unlock() from click / keydown handlers. Every method is safe to call before
 * that (it just does nothing) and never throws.
 */

import { preferPlayback } from "./playback";

const MUTE_KEY = "junhoo-paper-games-muted";

export type ToneOptions = {
  /** Start frequency in Hz. */
  freq: number;
  /** Optional end frequency; the pitch glides there over the duration. */
  to?: number;
  /** Seconds. */
  dur?: number;
  type?: OscillatorType;
  /** 0..1 */
  gain?: number;
  /** Seconds from now. */
  delay?: number;
};

export type NoiseOptions = {
  dur?: number;
  gain?: number;
  /** Band-pass centre in Hz; omit for white noise. */
  freq?: number;
  /** Optional end frequency of the band-pass sweep. */
  to?: number;
  delay?: number;
};

export type Synth = {
  unlock(): void;
  tone(options: ToneOptions): void;
  /** Several tones spaced `step` seconds apart: a tiny arpeggio. */
  arp(freqs: number[], step?: number, options?: Omit<ToneOptions, "freq" | "delay">): void;
  noise(options?: NoiseOptions): void;
  /** The context and the master gain once unlock() has run, for callers that build their own graph (music). */
  audio(): { ctx: AudioContext; out: AudioNode } | null;
  readonly muted: boolean;
  setMuted(muted: boolean): void;
  dispose(): void;
};

function readMuted() {
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function createSynth(): Synth {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let noiseBuffer: AudioBuffer | null = null;
  let muted = typeof window === "undefined" ? false : readMuted();
  let disposed = false;

  // A context that is still resuming keeps what is scheduled on it and plays it once it runs,
  // so the very first sound of a gesture is not lost.
  const ready = () => !disposed && !muted && ctx !== null && master !== null && ctx.state !== "closed";

  return {
    unlock() {
      if (disposed || typeof window === "undefined") return;
      preferPlayback();
      try {
        if (!ctx) {
          const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (!Ctor) return;
          ctx = new Ctor();
          master = ctx.createGain();
          master.gain.value = 0.5;
          master.connect(ctx.destination);
          noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
          const data = noiseBuffer.getChannelData(0);
          for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
        }
        if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
      } catch {
        ctx = null;
        master = null;
      }
    },

    tone({ freq, to, dur = 0.12, type = "sine", gain = 0.2, delay = 0 }) {
      if (!ready() || !ctx || !master) return;
      try {
        const t0 = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(Math.max(20, freq), t0);
        if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
        env.gain.setValueAtTime(0.0001, t0);
        env.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + 0.012);
        env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(env).connect(master);
        osc.start(t0);
        osc.stop(t0 + dur + 0.03);
      } catch {
        /* audio is decoration; never break the game for it */
      }
    },

    arp(freqs, step = 0.07, options = {}) {
      freqs.forEach((freq, index) => this.tone({ ...options, freq, delay: index * step }));
    },

    noise({ dur = 0.15, gain = 0.15, freq, to, delay = 0 } = {}) {
      if (!ready() || !ctx || !master || !noiseBuffer) return;
      try {
        const t0 = ctx.currentTime + delay;
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer;
        src.loop = true;
        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, t0);
        env.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + 0.01);
        env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        if (freq) {
          const filter = ctx.createBiquadFilter();
          filter.type = "bandpass";
          filter.Q.value = 1.2;
          filter.frequency.setValueAtTime(freq, t0);
          if (to) filter.frequency.exponentialRampToValueAtTime(Math.max(40, to), t0 + dur);
          src.connect(filter).connect(env).connect(master);
        } else {
          src.connect(env).connect(master);
        }
        src.start(t0, Math.random() * 0.5);
        src.stop(t0 + dur + 0.03);
      } catch {
        /* see tone() */
      }
    },

    audio() {
      return !disposed && ctx && master && ctx.state !== "closed" ? { ctx, out: master } : null;
    },

    get muted() {
      return muted;
    },

    setMuted(next) {
      muted = next;
      try {
        window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
      } catch {
        /* private mode */
      }
    },

    dispose() {
      disposed = true;
      try {
        void ctx?.close();
      } catch {
        /* already closed */
      }
      ctx = null;
      master = null;
    },
  };
}

let shared: Synth | null = null;

/** One synth for the whole page, for components that need it while rendering. Never disposed. */
export function sharedSynth(): Synth {
  shared ??= createSynth();
  return shared;
}
