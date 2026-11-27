/*
 * Procedural WebAudio for Gradient Survivors. Every sound effect and the whole
 * soundtrack are synthesized from oscillators, filtered noise and envelopes, so
 * there is nothing to download and everything can be rendered offline in tests.
 *
 *   renderSfx         one sound effect, scheduled into any context
 *   scheduleMusicBar  one bar (or a few 16th steps) of the title / run / boss loop
 *   renderStinger     the victory / defeat jingle
 *   createMixer       music + sfx buses -> master -> gentle limiter -> speakers
 *   createAudio       the live AudioEngine that the game and the UI talk to
 *
 * Browser audio APIs are only touched once createAudio().unlock() runs.
 */

import type { AudioEngine, AudioSettings, MusicMode, SfxName, SfxOptions } from "./contracts";

export const DEFAULT_AUDIO_SETTINGS: Readonly<AudioSettings> = Object.freeze({ muted: false, music: 0.5, sfx: 0.7 });

// ================================================================== synthesis

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** MIDI note number -> Hz (69 = A4 = 440 Hz). */
const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

/** Two seconds of white noise, shared by every noisy sound of one context. */
function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  let buffer = noiseBuffers.get(ctx);
  if (!buffer) {
    buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noiseBuffers.set(ctx, buffer);
  }
  return buffer;
}

let softClip: Float32Array<ArrayBuffer> | null = null;

/** tanh saturation curve (built once) that gives the boss bass its growl. */
function softClipCurve(): Float32Array<ArrayBuffer> {
  if (!softClip) {
    softClip = new Float32Array(1025);
    for (let i = 0; i < softClip.length; i++) {
      const x = (i / (softClip.length - 1)) * 2 - 1;
      softClip[i] = Math.tanh(1.6 * x) / Math.tanh(1.6);
    }
  }
  return softClip;
}

/**
 * Rises 0 -> peak over `attack`, holds, then falls exponentially to -60 dB and
 * linearly to exactly 0 at `end`, so neither edge clicks.
 */
function envelope(param: AudioParam, start: number, end: number, peak: number, attack: number, hold: number) {
  const level = Math.max(peak, 1e-4);
  const top = start + Math.min(attack, (end - start) * 0.5);
  const fadeEnd = Math.max(end - 0.004, top + 0.001);
  const decayStart = Math.min(top + hold, fadeEnd - 0.002);
  param.setValueAtTime(0, start);
  param.linearRampToValueAtTime(level, top);
  if (decayStart > top) param.setValueAtTime(level, decayStart);
  param.exponentialRampToValueAtTime(level * 1e-3, fadeEnd);
  param.linearRampToValueAtTime(0, Math.max(end, fadeEnd + 0.001));
}

/** Envelope, filter and modulation settings shared by tones and noise bursts. */
type Shape = {
  /** Start offset from the voice's start time (s). */
  at?: number;
  /** Length including the decay (s). */
  dur: number;
  /** Peak level. */
  gain: number;
  /** Rise time (s); default 3 ms. */
  attack?: number;
  /** Time held at the peak before the decay starts (s). */
  hold?: number;
  /** At most one filter: lowpass, highpass or bandpass at this cutoff (Hz). */
  lp?: number;
  hp?: number;
  bp?: number;
  q?: number;
  /** Cutoff (or path of cutoffs) the filter sweeps to by the end of the sound. */
  sweep?: number | readonly number[];
  /** Soft saturation after the filter. */
  drive?: boolean;
  /** Tremolo: [rate Hz, depth 0..0.5]. */
  trem?: readonly [number, number];
};

type Tone = Shape & {
  wave?: OscillatorType;
  /** Start frequency (Hz). */
  f: number;
  /** Frequency (or path of frequencies) reached over `glide` seconds. */
  to?: number | readonly number[];
  /** Glide length (s); default: the whole sound. */
  glide?: number;
  /** Static detune (cents). */
  detune?: number;
  /** Vibrato: [rate Hz, depth cents, fade-in s]. */
  vib?: readonly [number, number, number];
};

/**
 * One sound (an effect, or the notes of one music step). It builds and
 * schedules its nodes, then disconnects all of them once its last source ends.
 */
class Voice {
  /** Latest stop time scheduled so far (absolute seconds). */
  end: number;
  private readonly nodes: AudioNode[] = [];
  private live = 0;

  constructor(
    readonly ctx: BaseAudioContext,
    private out: AudioNode,
    /** Start time (absolute seconds); every `at` is relative to it. */
    readonly t: number,
    /** Multiplies every frequency, filters included. */
    private readonly pitch = 1,
  ) {
    this.end = t;
  }

  /** Sends the whole voice through a volume and stereo-position stage. */
  route(volume: number, pan: number) {
    if (pan !== 0 && typeof this.ctx.createStereoPanner === "function") {
      const panner = this.own(this.ctx.createStereoPanner());
      panner.pan.value = clamp(pan, -1, 1);
      panner.connect(this.out);
      this.out = panner;
    }
    if (volume !== 1) {
      const level = this.gain(volume);
      level.connect(this.out);
      this.out = level;
    }
  }

  tone(s: Tone) {
    const start = this.t + (s.at ?? 0);
    const end = start + s.dur;
    const osc = this.oscillator(s, start, end);
    this.shape(s, osc, start, end);
    this.run(osc, start, end);
  }

  noise(s: Shape) {
    const start = this.t + (s.at ?? 0);
    const end = start + s.dur;
    const src = this.own(this.ctx.createBufferSource());
    src.buffer = noiseBuffer(this.ctx);
    src.loop = true;
    this.shape(s, src, start, end);
    src.start(start, Math.random() * 1.5);
    this.stopAt(src, end);
  }

  /** A buzzy tone through parallel bandpass "formants", which sounds vowel-like. */
  formants(s: Tone, centers: readonly number[], q: number) {
    const start = this.t + (s.at ?? 0);
    const end = start + s.dur;
    const osc = this.oscillator(s, start, end);
    const env = this.gain(0);
    envelope(env.gain, start, end, s.gain, s.attack ?? 0.003, s.hold ?? 0);
    for (const center of centers) {
      const band = this.own(this.ctx.createBiquadFilter());
      band.type = "bandpass";
      band.frequency.value = this.freq(center);
      band.Q.value = q;
      osc.connect(band);
      band.connect(env);
    }
    env.connect(this.out);
    this.run(osc, start, end);
  }

  private own<T extends AudioNode>(node: T): T {
    this.nodes.push(node);
    return node;
  }

  private gain(value: number): GainNode {
    const node = this.own(this.ctx.createGain());
    node.gain.value = value;
    return node;
  }

  /** Scaled by the voice pitch and kept below Nyquist. */
  private freq(f: number) {
    return Math.min(f * this.pitch, this.ctx.sampleRate * 0.45);
  }

  /** Exponential glide through one or more targets, spread evenly over `length`. */
  private glide(param: AudioParam, targets: number | readonly number[], start: number, length: number) {
    if (typeof targets === "number") {
      param.exponentialRampToValueAtTime(this.freq(targets), start + length);
      return;
    }
    for (let i = 0; i < targets.length; i++) {
      param.exponentialRampToValueAtTime(this.freq(targets[i]), start + (length * (i + 1)) / targets.length);
    }
  }

  private oscillator(s: Tone, start: number, end: number): OscillatorNode {
    const osc = this.own(this.ctx.createOscillator());
    osc.type = s.wave ?? "sine";
    osc.frequency.setValueAtTime(this.freq(s.f), start);
    if (s.to !== undefined) this.glide(osc.frequency, s.to, start, Math.max(0.002, s.glide ?? s.dur));
    if (s.detune) osc.detune.value = s.detune;
    if (s.vib) {
      const [rate, cents, fadeIn] = s.vib;
      const lfo = this.own(this.ctx.createOscillator());
      lfo.frequency.value = rate;
      const depth = this.gain(0);
      depth.gain.setValueAtTime(0, start);
      depth.gain.linearRampToValueAtTime(cents, start + Math.max(0.001, fadeIn));
      lfo.connect(depth);
      depth.connect(osc.detune);
      this.run(lfo, start, end);
    }
    return osc;
  }

  /** src -> [filter] -> [saturation] -> envelope -> [tremolo] -> out */
  private shape(s: Shape, src: AudioNode, start: number, end: number) {
    let head = src;
    const cutoff = s.lp ?? s.hp ?? s.bp;
    if (cutoff !== undefined) {
      const filter = this.own(this.ctx.createBiquadFilter());
      filter.type = s.lp !== undefined ? "lowpass" : s.hp !== undefined ? "highpass" : "bandpass";
      filter.Q.value = s.q ?? (filter.type === "bandpass" ? 1 : 0.7);
      filter.frequency.setValueAtTime(this.freq(cutoff), start);
      if (s.sweep !== undefined) this.glide(filter.frequency, s.sweep, start, end - start);
      head.connect(filter);
      head = filter;
    }
    if (s.drive) {
      const shaper = this.own(this.ctx.createWaveShaper());
      shaper.curve = softClipCurve();
      shaper.oversample = "2x";
      head.connect(shaper);
      head = shaper;
    }
    const env = this.gain(0);
    envelope(env.gain, start, end, s.gain, s.attack ?? 0.003, s.hold ?? 0);
    head.connect(env);
    head = env;
    if (s.trem) {
      const [rate, depth] = s.trem;
      const trem = this.gain(1 - depth);
      const lfo = this.own(this.ctx.createOscillator());
      lfo.frequency.value = rate;
      const amount = this.gain(depth);
      lfo.connect(amount);
      amount.connect(trem.gain);
      head.connect(trem);
      head = trem;
      this.run(lfo, start, end);
    }
    head.connect(this.out);
  }

  private run(src: AudioScheduledSourceNode, start: number, end: number) {
    src.start(start);
    this.stopAt(src, end);
  }

  private stopAt(src: AudioScheduledSourceNode, end: number) {
    this.live++;
    src.onended = this.release;
    src.stop(end + 0.005);
    this.end = Math.max(this.end, end + 0.005);
  }

  private release = () => {
    if (--this.live > 0) return;
    for (const node of this.nodes) node.disconnect();
    this.nodes.length = 0;
  };
}

// ================================================================== sound effects

/** Vowel formants (F1, F2 in Hz) that Reviewer 2 grumbles through. */
const VOWELS = [
  [730, 1090],
  [530, 1840],
  [300, 2200],
  [570, 840],
  [440, 1020],
  [660, 1700],
] as const;

/** Each effect is designed at pitch 1; the Voice scales every frequency. */
const SFX: Record<SfxName, (v: Voice) => void> = {
  // gradient bolt: a soft, lowpassed square "pew"
  shoot: (v) => v.tone({ wave: "square", f: 880, to: 440, dur: 0.06, gain: 0.13, lp: 3000 }),

  // tiny tick: a falling triangle blip and a 10 ms click of filtered noise
  hit: (v) => {
    v.tone({ wave: "triangle", f: 1200, to: 600, dur: 0.025, gain: 0.11 });
    v.noise({ dur: 0.01, gain: 0.06, bp: 4000, q: 0.8 });
  },

  // brighter hit with a sparkle on top
  crit: (v) => {
    v.tone({ wave: "square", f: 1500, to: 900, dur: 0.04, gain: 0.14, lp: 6000 });
    v.tone({ f: 2400, at: 0.012, dur: 0.03, gain: 0.23 });
  },

  // bubbly pop: a falling sine "bloop" and a puff of bandpassed noise
  kill: (v) => {
    v.tone({ f: 520, to: 160, dur: 0.09, gain: 0.38, attack: 0.002 });
    v.noise({ dur: 0.05, gain: 0.2, bp: 1500, q: 1.2 });
  },

  // low boom: noise through a closing lowpass and a sub thump
  explode: (v) => {
    v.noise({ dur: 0.5, gain: 1.3, lp: 1800, sweep: 200, q: 0.8, attack: 0.004 });
    v.tone({ f: 120, to: 40, dur: 0.4, gain: 0.9, attack: 0.004 });
  },

  // sparkly chime: fundamental plus octave partial (the game raises the pitch along a pickup chain)
  gem: (v) => {
    v.tone({ f: 660, dur: 0.08, gain: 0.09, attack: 0.002 });
    v.tone({ f: 1320, dur: 0.07, gain: 0.065, attack: 0.002 });
  },

  // rising C5-E5-G5-C6 arpeggio of soft squares with a shimmering tail
  levelup: (v) => {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    for (let i = 0; i < notes.length; i++) {
      const last = i === notes.length - 1;
      v.tone({ wave: "square", f: notes[i], at: i * 0.06, dur: last ? 0.3 : 0.1, gain: 0.46, lp: 2600, attack: 0.004 });
      v.tone({ wave: "triangle", f: notes[i] / 2, at: i * 0.06, dur: last ? 0.3 : 0.1, gain: 0.4, attack: 0.004 });
    }
    v.tone({ f: 2093, at: 0.18, dur: 0.34, gain: 0.16, attack: 0.03, trem: [14, 0.45] });
    v.tone({ f: 3136, at: 0.22, dur: 0.3, gain: 0.09, attack: 0.03, trem: [11, 0.45] });
  },

  // confirm: two triangle notes up, G5 -> C6
  pick: (v) => {
    v.tone({ wave: "triangle", f: 783.99, dur: 0.07, gain: 0.43 });
    v.tone({ wave: "triangle", f: 1046.5, at: 0.06, dur: 0.14, gain: 0.46 });
  },

  hover: (v) => v.tone({ f: 900, dur: 0.03, gain: 0.105, attack: 0.004 }),

  click: (v) => v.tone({ wave: "triangle", f: 600, to: 520, dur: 0.04, gain: 0.28 }),

  // "oof": a falling lowpassed square and a dull noise thud
  hurt: (v) => {
    v.tone({ wave: "square", f: 220, to: 110, dur: 0.15, gain: 0.45, lp: 1200, sweep: 500 });
    v.noise({ dur: 0.08, gain: 0.7, lp: 500 });
  },

  // lub-dub: two low sine thumps, with a triangle overtone so small speakers hear them
  heartbeat: (v) => {
    v.tone({ f: 75, to: 55, dur: 0.15, gain: 0.54, attack: 0.006 });
    v.tone({ wave: "triangle", f: 140, to: 100, dur: 0.09, gain: 0.22, lp: 400 });
    v.tone({ f: 70, to: 50, at: 0.18, dur: 0.17, gain: 0.39, attack: 0.006 });
    v.tone({ wave: "triangle", f: 130, to: 95, at: 0.18, dur: 0.09, gain: 0.15, lp: 400 });
  },

  // attention beam: a rising saw through a sweeping bandpass, plus hiss
  beam: (v) => {
    v.tone({ wave: "sawtooth", f: 300, to: 1800, dur: 0.18, gain: 0.56, bp: 600, sweep: 3200, q: 2.5, attack: 0.01 });
    v.noise({ dur: 0.16, gain: 0.11, hp: 5000, attack: 0.02 });
  },

  // SHOT shockwave: a bandpassed noise whoosh up and a low thump
  shock: (v) => {
    v.noise({ dur: 0.3, gain: 0.6, bp: 400, sweep: 2400, q: 1.2, attack: 0.03 });
    v.tone({ f: 90, to: 60, dur: 0.2, gain: 0.47 });
  },

  // looped boomerang: a whirring triangle with fast vibrato and flutter
  boomerang: (v) =>
    v.tone({ wave: "triangle", f: 500, to: 700, dur: 0.25, gain: 0.27, attack: 0.03, hold: 0.1, vib: [12, 70, 0.01], trem: [12, 0.3] }),

  // template anchor: inharmonic partials ring like metal, plus a click
  anchor: (v) => {
    v.tone({ f: 330, dur: 0.3, gain: 0.17, attack: 0.002 });
    v.tone({ f: 497, dur: 0.22, gain: 0.14, attack: 0.002 });
    v.tone({ f: 1093, dur: 0.08, gain: 0.05, attack: 0.001 });
    v.noise({ dur: 0.015, gain: 0.17, hp: 3000 });
  },

  // support vector: a glassy ping (the inharmonic partial makes it glassy)
  orb: (v) => {
    v.tone({ f: 1800, dur: 0.05, gain: 0.11, attack: 0.002 });
    v.tone({ f: 4968, dur: 0.03, gain: 0.025, attack: 0.001 });
  },

  // dropout field: a tiny electric crackle
  zap: (v) => v.noise({ dur: 0.04, gain: 0.38, bp: 3000, q: 3 }),

  // Reviewer 2 incoming: a two-cycle siren with tremolo
  bossWarn: (v) =>
    v.tone({ wave: "square", f: 440, to: [660, 440, 660, 440], dur: 1.2, gain: 0.5, attack: 0.02, hold: 1.0, lp: 2000, trem: [9, 0.35] }),

  // a volley of rejections: "pfft" noise plus a falling square
  bossShot: (v) => {
    v.noise({ dur: 0.08, gain: 0.45, bp: 1200, sweep: 500, q: 0.9 });
    v.tone({ wave: "square", f: 600, to: 300, dur: 0.1, gain: 0.18, lp: 2200 });
  },

  // dull thud on Reviewer 2
  bossHit: (v) => {
    v.tone({ f: 150, to: 90, dur: 0.07, gain: 0.27 });
    v.noise({ dur: 0.05, gain: 0.16, lp: 900 });
  },

  // Reviewer 2 defeated: a long boom, a descending "wah" and a sparkle tail
  bossDie: (v) => {
    v.noise({ dur: 1.2, gain: 1.5, lp: 2500, sweep: 90, q: 0.9, attack: 0.005 });
    v.tone({ f: 110, to: 30, dur: 0.8, gain: 1.0, attack: 0.004 });
    v.tone({ wave: "sawtooth", f: 600, to: 150, at: 0.1, dur: 0.7, gain: 0.45, lp: 2400, sweep: [700, 1400, 300], q: 4, attack: 0.02 });
    const sparkle = [2637, 3136, 2349, 3520, 2794];
    for (let i = 0; i < sparkle.length; i++) v.tone({ f: sparkle[i], at: 0.45 + i * 0.13, dur: 0.18, gain: 0.1 });
  },

  // ACRO rollback: tape rewind, a warbling swoop down and back up, and noise that swells then stops
  revive: (v) => {
    v.tone({ f: 1200, to: [300, 1200], dur: 0.7, gain: 0.36, attack: 0.03, hold: 0.55, vib: [18, 60, 0.05] });
    v.noise({ dur: 0.62, gain: 0.56, bp: 500, sweep: 4000, q: 1.5, attack: 0.55 });
  },

  // coffee: a warm C-E-G sine shimmer
  heal: (v) => {
    const notes = [523.25, 659.25, 783.99];
    for (let i = 0; i < notes.length; i++) v.tone({ f: notes[i], at: i * 0.05, dur: 0.34, gain: 0.3, attack: 0.03, vib: [6, 10, 0.1] });
    v.tone({ f: 1046.5, at: 0.12, dur: 0.28, gain: 0.11, attack: 0.04, trem: [12, 0.4] });
  },

  // magnet: a whoosh up, then a cascade of pentatonic chimes falling in
  magnet: (v) => {
    v.noise({ dur: 0.35, gain: 0.8, bp: 300, sweep: 3000, q: 1.4, attack: 0.15 });
    const chimes = [2637, 2349, 2093, 1760, 1568, 1319];
    for (let i = 0; i < chimes.length; i++) v.tone({ f: chimes[i], at: 0.2 + i * 0.06, dur: 0.12, gain: 0.3 });
  },

  // combo milestone: a short G5-C6-E6 fanfare
  combo: (v) => {
    const notes = [783.99, 1046.5, 1318.5];
    for (let i = 0; i < notes.length; i++) {
      const last = i === notes.length - 1;
      v.tone({ wave: "square", f: notes[i], at: i * 0.07, dur: last ? 0.22 : 0.08, gain: 0.27, lp: 3200 });
      v.tone({ wave: "triangle", f: notes[i] / 2, at: i * 0.07, dur: last ? 0.22 : 0.08, gain: 0.21 });
    }
  },

  // one grumbly syllable: a random pitch through a random vowel, sagging a little
  talk: (v) => {
    const [f1, f2] = VOWELS[Math.floor(Math.random() * VOWELS.length)];
    const f = 180 + Math.random() * 80;
    v.formants({ wave: "square", f, to: f * 0.86, dur: 0.045, gain: 0.18, attack: 0.006 }, [f1, f2], 2.5);
  },

  // rubber stamp: a deep thunk, a knock, a lowpassed slap and a little paper rustle
  stamp: (v) => {
    v.tone({ f: 90, to: 50, dur: 0.12, gain: 1.6, attack: 0.002 });
    v.tone({ wave: "triangle", f: 220, to: 90, dur: 0.07, gain: 0.65, attack: 0.001 });
    v.noise({ dur: 0.04, gain: 1.5, lp: 1400, attack: 0.001 });
    v.noise({ at: 0.06, dur: 0.07, gain: 0.1, hp: 4000 });
    v.noise({ at: 0.13, dur: 0.05, gain: 0.08, hp: 5000 });
  },
};

/** Every sound effect name; the SFX table's type guarantees none is missing. */
export const SFX_NAMES = Object.keys(SFX) as SfxName[];

/** Shared by renderSfx and the live engine (which passes a wobbled pitch without allocating). */
function scheduleSfx(ctx: BaseAudioContext, dest: AudioNode, name: SfxName, when: number, pitch: number, volume: number, pan: number) {
  const design = SFX[name];
  if (!design || !(volume > 0)) return 0;
  const voice = new Voice(ctx, dest, when, Number.isFinite(pitch) ? clamp(pitch, 0.25, 3) : 1);
  voice.route(Math.min(volume, 1), Number.isFinite(pan) ? pan : 0);
  design(voice);
  return voice.end - when;
}

/**
 * Schedule one sound effect into any audio context (also an OfflineAudioContext,
 * which tests use to render and measure sounds). Returns its duration in seconds.
 */
export function renderSfx(ctx: BaseAudioContext, dest: AudioNode, name: SfxName, when: number, opts?: SfxOptions): number {
  return scheduleSfx(ctx, dest, name, when, opts?.pitch ?? 1, opts?.volume ?? 1, opts?.pan ?? 0);
}

// ================================================================== music

/** One note: MIDI pitch, length in 16th steps, and the pitch before it (for glides). */
type Note = { m: number; len: number; prev: number };
/** For each bar, the note starting on each 16th step (if any). */
type Melody = (Note | undefined)[][];

const PITCH_CLASS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "A4", "G#5", "Bb3" -> MIDI note number. */
function midi(name: string) {
  const accidental = name[1] === "#" ? 1 : name[1] === "b" ? -1 : 0;
  return PITCH_CLASS[name[0]] + accidental + 12 * (Number(name.slice(accidental ? 2 : 1)) + 1);
}

/**
 * Reads bars written one token per 16th step: a note name starts a note, "."
 * holds it, "-" is silence. Every note remembers the one before it (wrapping
 * around the loop) so a lead can glide between them.
 */
function melody(bars: readonly string[]): Melody {
  const notes: Note[] = [];
  const parsed = bars.map((bar) => {
    const steps: (Note | undefined)[] = [];
    let held: Note | undefined;
    bar
      .trim()
      .split(/\s+/)
      .forEach((token, step) => {
        if (token === ".") {
          if (held) held.len++;
        } else if (token === "-") {
          held = undefined;
        } else {
          held = { m: midi(token), len: 1, prev: 0 };
          steps[step] = held;
          notes.push(held);
        }
      });
    return steps;
  });
  for (let i = 0; i < notes.length; i++) notes[i].prev = notes[(i + notes.length - 1) % notes.length].m;
  return parsed;
}

type Chord = { bass: number; tones: readonly number[] };

/** Bass root (octave 2) and a close voicing around middle C. */
const CHORDS = {
  Am: { bass: 45, tones: [60, 64, 69] },
  F: { bass: 41, tones: [60, 65, 69] },
  C: { bass: 48, tones: [60, 64, 67] },
  G: { bass: 43, tones: [59, 62, 67] },
  E: { bass: 40, tones: [59, 64, 68] },
} satisfies Record<string, Chord>;

/** The i-th note of an arpeggio climbing through a chord's tones, octave after octave. */
const arpeggio = (tones: readonly number[], i: number) => tones[i % tones.length] + 12 * Math.floor(i / tones.length);

/** How much of a layer that enters at `threshold` is in (it fades in over 0.1 of intensity). */
const layer = (intensity: number, threshold: number) => clamp((intensity - threshold) / 0.1, 0, 1);

// ------------------------------------------------------------------ drum kit

function kick(v: Voice, gain: number, at = 0) {
  v.tone({ f: 150, to: 45, glide: 0.09, at, dur: 0.26, gain, attack: 0.002 });
  v.noise({ at, dur: 0.012, gain: gain * 0.2, hp: 2500 });
}

function snare(v: Voice, gain: number, at = 0) {
  v.noise({ at, dur: 0.15, gain, bp: 1900, q: 0.7 });
  v.tone({ wave: "triangle", f: 210, to: 150, at, dur: 0.07, gain: gain * 0.5 });
}

function hat(v: Voice, gain: number, open = false) {
  v.noise({ dur: open ? 0.16 : 0.035, gain, hp: 7500 });
}

function crash(v: Voice, gain: number, at = 0) {
  v.noise({ at, dur: 1.1, gain, hp: 4500, attack: 0.002 });
}

function tom(v: Voice, f: number, gain: number) {
  v.tone({ f, to: f * 0.6, dur: 0.24, gain, attack: 0.002 });
  v.noise({ dur: 0.03, gain: gain * 0.3, bp: f * 4 });
}

// ------------------------------------------------------------------ songs

type LoopMode = "title" | "run" | "boss";

type Song = {
  bpm: number;
  /** Schedules the notes starting on one 16th step; the voice starts at that step. */
  step: (v: Voice, bar: number, step: number, sixteenth: number, intensity: number) => void;
};

// Title: chill music box. Plucked arpeggio, warm pad, sine bass; a bell tune every other 4 bars.
const TITLE_CHORDS = [
  { bass: 45, pad: CHORDS.Am.tones, arp: [57, 64, 69, 72, 76, 72, 69, 64] }, // Am
  { bass: 41, pad: CHORDS.F.tones, arp: [53, 60, 65, 69, 72, 69, 65, 60] }, // F
  { bass: 40, pad: CHORDS.C.tones, arp: [52, 60, 64, 67, 72, 67, 64, 60] }, // C/E
  { bass: 43, pad: CHORDS.G.tones, arp: [55, 62, 67, 71, 74, 71, 67, 62] }, // G
];

const TITLE_BELL = melody([
  "E5 . . . . . . . D5 . . . C5 . . .",
  "C5 . . . . . . . . . . . A4 . . .",
  "G4 . . . . . . . C5 . . . E5 . . .",
  "D5 . . . . . . . . . . . - - - -",
]);

function bell(v: Voice, m: number, dur: number, gain: number) {
  v.tone({ f: hz(m), dur, gain, attack: 0.008 });
  v.tone({ f: hz(m) * 2, dur: dur * 0.5, gain: gain * 0.3, attack: 0.008 });
  v.tone({ f: hz(m) * 3.01, dur: dur * 0.25, gain: gain * 0.1, attack: 0.005 });
}

const TITLE: Song = {
  bpm: 92,
  step(v, bar, s, sixteenth) {
    const chord = TITLE_CHORDS[bar % 4];
    if (s === 0) {
      const length = 16 * sixteenth;
      for (const m of chord.pad) {
        for (const detune of [-7, 7]) {
          v.tone({ wave: "triangle", f: hz(m), detune, dur: length + 0.5, gain: 0.05, attack: 0.5, hold: length - 0.8, lp: 1400 });
        }
      }
      v.tone({ f: hz(chord.bass), dur: 12 * sixteenth, gain: 0.3, attack: 0.02, hold: 8 * sixteenth });
    }
    if (s % 2 === 0) {
      const m = chord.arp[s / 2];
      v.tone({ wave: "triangle", f: hz(m), dur: 0.45, gain: 0.16, attack: 0.005, lp: 2600 });
      v.tone({ f: hz(m + 12), at: 3 * sixteenth, dur: 0.3, gain: 0.035 });
    }
    if (s % 4 === 2) hat(v, 0.06);
    if (bar % 8 >= 4) {
      if (s === 0 || s === 10) kick(v, 0.3);
      const note = TITLE_BELL[bar % 4][s];
      if (note) bell(v, note.m, note.len * sixteenth + 0.9, 0.15);
    }
  },
};

// Run: upbeat A minor, 128 BPM. A 32-bar form (A, A with a new groove, B with a new tune, A)
// over an 8-bar progression; intensity brings in drums, then the lead, then the full band.
const RUN_CHORDS = [CHORDS.Am, CHORDS.F, CHORDS.C, CHORDS.G, CHORDS.Am, CHORDS.F, CHORDS.G, CHORDS.E];

/** Bass rhythm per 16th: R root, O octave. */
const RUN_BASS = "R.O.R.O.R.O.R.O.";
const RUN_BASS_SYNCOPATED = "R..RO.R.R..RO.RO";

/** The hook: a 2-bar pentatonic phrase, answered and varied over 8 bars. */
const RUN_LEAD = melody([
  "A4 . . C5 . . E5 . D5 . E5 . G5 . E5 .",
  "C5 . . A4 . . G4 . A4 . . . . . - -",
  "G4 . . C5 . . E5 . D5 . E5 . G5 . A5 .",
  "G5 . . E5 . . D5 . G4 . . . . . - -",
  "A4 . . C5 . . E5 . D5 . E5 . G5 . E5 .",
  "C5 . . A4 . . G4 . A4 . C5 . D5 . E5 .",
  "G5 . . . D5 . G5 . A5 . . . G5 . D5 .",
  "E5 . . . D5 . C5 . B4 . . . G#4 . B4 .",
]);

/** The B section's long-note tune. */
const RUN_LEAD_B = melody([
  "E5 . . . . . . . A5 . . . G5 . . .",
  "F5 . . . . . . . E5 . . . C5 . . .",
  "E5 . . . . . . . G5 . . . C6 . . .",
  "B5 . . . . . . . A5 . . . G5 . . .",
  "A5 . . . . . . . E5 . . . C5 . . .",
  "C5 . . . . . . . F5 . . . A5 . . .",
  "G5 . . . . . . . D5 . . . G5 . . .",
  "G#5 . . . . . . . E5 . . . . . . .",
]);

/** Chord-tone order of the 8th-note arpeggio under the B tune: up 1.5 octaves and back. */
const RUN_ARP = [0, 1, 2, 3, 4, 3, 2, 1];

/** Half-note counter-melody under the hook (full band only). */
const RUN_COUNTER = melody([
  "E4 . . . . . . . C4 . . . . . . .",
  "C4 . . . . . . . A3 . . . . . . .",
  "G3 . . . . . . . C4 . . . . . . .",
  "D4 . . . . . . . B3 . . . . . . .",
  "C4 . . . . . . . E4 . . . . . . .",
  "F4 . . . . . . . A4 . . . . . . .",
  "G4 . . . . . . . D4 . . . . . . .",
  "E4 . . . . . . . G#4 . . . . . . .",
]);

const LEAD_VIBRATO = [5.5, 14, 0.15] as const;

/** Lowpassed square lead with vibrato on long notes and a quiet echo 3 steps later. */
function squareLead(v: Voice, note: Note, sixteenth: number, gain: number) {
  const length = note.len * sixteenth;
  const f = hz(note.m);
  v.tone({ wave: "square", f, dur: length + 0.04, gain, attack: 0.006, hold: length * 0.5, lp: 2400, vib: note.len >= 4 ? LEAD_VIBRATO : undefined });
  v.tone({ wave: "square", f, at: 3 * sixteenth, dur: Math.min(length, 2 * sixteenth) + 0.04, gain: gain * 0.3, attack: 0.006, lp: 1500 });
}

const RUN: Song = {
  bpm: 128,
  step(v, bar, s, sixteenth, intensity) {
    const phraseBar = bar % 8;
    const section = Math.floor(bar / 8) % 4;
    const chord = RUN_CHORDS[phraseBar];
    const drums = layer(intensity, 0.2);
    const lead = layer(intensity, 0.45);
    const full = layer(intensity, 0.7);
    const fill = phraseBar === 7 && s >= 12;

    // bass: always on, roots and octaves on 8ths (syncopated in the second section)
    const b = (section === 1 ? RUN_BASS_SYNCOPATED : RUN_BASS)[s];
    if (b !== ".") {
      v.tone({ wave: "triangle", f: hz(chord.bass + (b === "O" ? 12 : 0)), dur: 1.9 * sixteenth, gain: 0.34, attack: 0.004, hold: 0.9 * sixteenth });
    }

    // closed hat on the offbeats; every 16th once the full band is in
    if (s % 4 === 2) hat(v, 0.09);
    else if (full > 0) hat(v, (s % 2 === 0 ? 0.06 : 0.035) * full);

    // kick and snare; four on the floor with the full band; a snare fill into each phrase
    if (drums > 0) {
      if (fill) {
        snare(v, (0.2 + 0.06 * (s - 12)) * drums);
      } else {
        const kickOn = s === 0 || s === 8 || (section === 1 ? s === 6 || s === 14 : s === 10);
        if (kickOn) kick(v, 0.6 * drums);
        else if (full > 0 && (s === 4 || s === 12)) kick(v, 0.45 * full);
        if (s === 4 || s === 12) snare(v, 0.3 * drums);
      }
    }
    if (s === 0 && phraseBar === 0 && lead > 0) crash(v, 0.08 * lead);

    if (lead > 0) {
      const note = (section === 2 ? RUN_LEAD_B : RUN_LEAD)[phraseBar][s];
      if (note) squareLead(v, note, sixteenth, 0.09 * lead);
    }

    if (full > 0) {
      // counter-melody (an arpeggio under the B tune) and offbeat chord stabs
      if (section === 2) {
        if (s % 2 === 0) v.tone({ wave: "triangle", f: hz(arpeggio(chord.tones, RUN_ARP[s / 2])), dur: 0.16, gain: 0.1 * full });
      } else {
        const note = RUN_COUNTER[phraseBar][s];
        if (note) {
          const length = note.len * sixteenth;
          v.tone({ wave: "triangle", f: hz(note.m), dur: length, gain: 0.14 * full, attack: 0.02, hold: length * 0.6 });
        }
      }
      if (s % 4 === 2 && !fill) {
        for (const m of chord.tones) v.tone({ wave: "sawtooth", f: hz(m), dur: 0.11, gain: 0.04 * full, lp: 2600, sweep: 800 });
      }
    }
  },
};

// Boss: 140 BPM, Am - F - G - E (harmonic minor). Galloping saw bass, 16th hats,
// tom fills every 4 bars and a siren-like lead that glides between its notes.
const BOSS_CHORDS = [CHORDS.Am, CHORDS.F, CHORDS.G, CHORDS.E];
const BOSS_BASS = "R.RRR.RRR.RRO.RO";
const BOSS_TOMS = [262, 220, 175, 147];

const BOSS_LEAD = melody([
  // the alarm
  "A5 . . . E5 . . . A5 . . . E5 . . .",
  "A5 . . . F5 . . . A5 . . . F5 . . .",
  "B5 . . . G5 . . . B5 . . . G5 . . .",
  "B5 . . . G#5 . . . B5 . . . E5 . . .",
  // the complaint, in harmonic minor
  "E5 . F5 . E5 . D5 . C5 . . . B4 . C5 .",
  "A4 . . . C5 . F5 . A5 . . . G5 . F5 .",
  "G5 . . . F5 . . . D5 . . . B4 . D5 .",
  "E5 . . . G#5 . . . B5 . . . D6 . B5 .",
]);

const ALARM_TREMOLO = [7, 0.25] as const;

const BOSS: Song = {
  bpm: 140,
  step(v, bar, s, sixteenth) {
    const chord = BOSS_CHORDS[bar % 4];
    const fill = bar % 4 === 3 && s >= 12;

    const b = BOSS_BASS[s];
    if (b !== ".") {
      const f = hz(chord.bass + (b === "O" ? 12 : 0));
      v.tone({ wave: "sawtooth", f, dur: 1.5 * sixteenth, gain: 0.28, attack: 0.003, hold: 0.6 * sixteenth, lp: 1100, drive: true });
    }

    if (fill) {
      tom(v, BOSS_TOMS[s - 12], 0.6);
    } else {
      hat(v, s % 2 === 0 ? 0.11 : 0.063, s === 14 && bar % 2 === 1);
      if (s % 4 === 0) kick(v, 0.8);
      if (s === 4 || s === 12) snare(v, 0.45);
    }
    if (s === 0 && bar % 4 === 0) crash(v, 0.11);

    const note = BOSS_LEAD[bar % 8][s];
    if (note) {
      const length = note.len * sixteenth;
      v.tone({
        wave: "square",
        f: hz(note.prev),
        to: hz(note.m),
        glide: 0.06,
        dur: length + 0.02,
        gain: 0.12,
        attack: 0.005,
        hold: length * 0.6,
        lp: 2200,
        trem: note.len >= 4 ? ALARM_TREMOLO : undefined,
      });
    }
  },
};

const SONGS: Record<LoopMode, Song> = { title: TITLE, run: RUN, boss: BOSS };

/**
 * Schedule one bar of a music loop at `when`; returns the bar's length (s).
 * The live scheduler passes a step range to schedule one 16th at a time.
 */
export function scheduleMusicBar(
  ctx: BaseAudioContext,
  dest: AudioNode,
  mode: LoopMode,
  bar: number,
  when: number,
  intensity: number,
  fromStep = 0,
  toStep = 16,
): number {
  const song = SONGS[mode];
  const sixteenth = 15 / song.bpm;
  const index = Math.max(0, Math.floor(bar));
  const level = Number.isFinite(intensity) ? clamp(intensity, 0, 1) : 0;
  for (let s = Math.max(0, fromStep); s < Math.min(16, toStep); s++) {
    song.step(new Voice(ctx, dest, when + s * sixteenth), index, s, sixteenth, level);
  }
  return 16 * sixteenth;
}

/** Schedule the victory fanfare or the defeat "sad trombone"; returns its length (s). */
export function renderStinger(ctx: BaseAudioContext, dest: AudioNode, kind: "victory" | "defeat", when: number): number {
  const v = new Voice(ctx, dest, when);
  if (kind === "victory") {
    // ta-ta-ta-taaa: C5 E5 G5, then a held C6 over a bright C major chord
    const run = [72, 76, 79];
    for (let i = 0; i < run.length; i++) {
      v.tone({ wave: "square", f: hz(run[i]), at: i * 0.1, dur: 0.12, gain: 0.28, lp: 3200 });
      v.tone({ wave: "triangle", f: hz(run[i] - 12), at: i * 0.1, dur: 0.12, gain: 0.35 });
    }
    const hit = 0.3;
    v.tone({ wave: "square", f: hz(84), at: hit, dur: 1.6, gain: 0.28, attack: 0.01, hold: 0.8, lp: 3200, vib: [6, 16, 0.3] });
    for (const m of [60, 64, 67, 72, 76]) {
      v.tone({ wave: "sawtooth", f: hz(m), at: hit, dur: 1.5, gain: 0.085, attack: 0.02, hold: 0.7, lp: 2600, sweep: 900 });
    }
    v.tone({ wave: "triangle", f: hz(48), at: hit, dur: 1.3, gain: 0.55, hold: 0.6 });
    kick(v, 1, hit);
    crash(v, 0.17, hit);
    const sparkle = [96, 91, 100, 103, 98];
    for (let i = 0; i < sparkle.length; i++) v.tone({ f: hz(sparkle[i]), at: 0.5 + i * 0.2, dur: 0.25, gain: 0.1 });
  } else {
    // sad trombone: three sagging "wah"s down a semitone each, then a long wobbly one
    const wahs = [62, 61, 60];
    for (let i = 0; i < wahs.length; i++) {
      const f = hz(wahs[i]);
      v.tone({ wave: "sawtooth", f: f * 0.96, to: f, glide: 0.08, at: i * 0.42, dur: 0.38, gain: 0.63, attack: 0.04, hold: 0.18, lp: 350, sweep: [1400, 400], q: 3 });
    }
    const last = hz(59);
    v.tone({
      wave: "sawtooth",
      f: last * 0.96,
      to: [last, last, hz(57)],
      at: 1.26,
      dur: 0.9,
      gain: 0.63,
      attack: 0.05,
      hold: 0.55,
      lp: 350,
      sweep: [1500, 1100, 300],
      q: 3,
      vib: [5, 45, 0.25],
    });
    for (const m of [45, 48, 52]) v.tone({ wave: "triangle", f: hz(m), at: 1.26, dur: 0.9, gain: 0.15, attack: 0.1, hold: 0.4 });
  }
  return v.end - when;
}

// ================================================================== mixer

export type AudioMixer = {
  /** Sound effects connect here. */
  sfx: GainNode;
  /** Music connects here. */
  music: GainNode;
  master: GainNode;
  limiter: DynamicsCompressorNode;
};

/** Slider position (0..1) -> gain; squared so the slider feels even. */
const taper = (x: number) => x * x;
/** At equal slider positions the score sits about 5 dB under the sound effects. */
const MUSIC_TRIM = 0.55;
const musicGain = (settings: AudioSettings) => taper(settings.music) * MUSIC_TRIM;

/** Builds the music and sfx buses -> master gain -> gentle limiter -> ctx.destination. */
export function createMixer(ctx: BaseAudioContext, settings: AudioSettings = DEFAULT_AUDIO_SETTINGS): AudioMixer {
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -8;
  limiter.knee.value = 8;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.25;
  const master = ctx.createGain();
  const music = ctx.createGain();
  const sfx = ctx.createGain();
  master.gain.value = settings.muted ? 0 : 1;
  music.gain.value = musicGain(settings);
  sfx.gain.value = taper(settings.sfx);
  music.connect(master);
  sfx.connect(master);
  master.connect(limiter);
  limiter.connect(ctx.destination);
  return { sfx, music, master, limiter };
}

// ================================================================== live engine

/**
 * Minimum seconds between two plays of the same effect. Explosions and boss
 * volleys come in same-frame bursts that would only stack into one loud blast.
 */
const MIN_INTERVAL: Partial<Record<SfxName, number>> = {
  shoot: 0.06,
  hit: 0.03,
  crit: 0.05,
  kill: 0.025,
  gem: 0.02,
  orb: 0.06,
  zap: 0.12,
  bossHit: 0.07,
  talk: 0.05,
  hover: 0.04,
  heartbeat: 0.5,
  explode: 0.05,
  bossShot: 0.08,
};

/** Frequent, unimportant effects: the first to be dropped when many sounds play at once. */
const LOW_PRIORITY = new Set<SfxName>(["shoot", "hit", "gem", "orb", "zap", "talk", "hover"]);
/** Effects the player must hear: only these may take the last free voices. */
const IMPORTANT = new Set<SfxName>(["levelup", "pick", "click", "hurt", "heartbeat", "bossWarn", "bossDie", "revive", "heal", "magnet", "combo", "stamp"]);
/** Effects that get a random ±4% pitch wobble so repeats do not sound robotic. */
const WOBBLE = new Set<SfxName>([...LOW_PRIORITY, "crit", "kill", "bossHit"]);

const MAX_VOICES = 24;
/** An effect only starts while fewer voices than this are busy (lower priority -> lower limit). */
const voiceLimit = (name: SfxName) => (LOW_PRIORITY.has(name) ? 16 : IMPORTANT.has(name) ? MAX_VOICES : 20);
/** Effects start this far ahead so their attack is never cut short (s). */
const SFX_LEAD = 0.01;
/** The music scheduler wakes every TICK_MS and schedules LOOKAHEAD seconds ahead. */
const TICK_MS = 25;
const LOOKAHEAD = 0.15;
/** Crossfade between music modes (s). */
const FADE = 0.6;
/** Time constant for smoothing the requested intensity (s). */
const INTENSITY_TAU = 1.5;

type Track = {
  mode: Exclude<MusicMode, "off">;
  gain: GainNode;
  bar: number;
  step: number;
  /** Time of the current bar's first step. */
  barStart: number;
  /** Intensity read at the start of the current bar. */
  barIntensity: number;
  /** When a stinger is over, or when a faded track can be disconnected. */
  endsAt: number;
};

const isLoop = (mode: MusicMode): mode is LoopMode => mode === "title" || mode === "run" || mode === "boss";

/** Counters exposed for tests and the console; not part of the AudioEngine contract. */
export type AudioDebug = {
  state: AudioContextState | "none";
  activeVoices: number;
  peakVoices: number;
  played: number;
  throttled: number;
  dropped: number;
  music: MusicMode;
  intensity: number;
  tracks: number;
};

function mergeSettings(base: AudioSettings, patch: Partial<AudioSettings> | undefined): AudioSettings {
  const level = (x: unknown, fallback: number) => (typeof x === "number" && Number.isFinite(x) ? clamp(x, 0, 1) : fallback);
  return {
    muted: typeof patch?.muted === "boolean" ? patch.muted : base.muted,
    music: level(patch?.music, base.music),
    sfx: level(patch?.sfx, base.sfx),
  };
}

type AudioContextConstructor = new () => AudioContext;

export function createAudio(initial?: Partial<AudioSettings>): AudioEngine & { readonly __debug: AudioDebug } {
  let settings = mergeSettings(DEFAULT_AUDIO_SETTINGS, initial);
  let ctx: AudioContext | null = null;
  let mixer: AudioMixer | null = null;
  let timer: ReturnType<typeof setInterval> | undefined;
  let failed = false;
  let disposed = false;
  /** suspend() was called: stay silent until resume(), whatever unlock() says. */
  let paused = false;
  /** The context has run at least once, so `unlocked` stays true through pauses. */
  let ranOnce = false;

  const lastPlayed = new Map<SfxName, number>();
  /** When each of the MAX_VOICES effect slots frees up. */
  const voiceEnds = new Float64Array(MAX_VOICES);
  const stats = { played: 0, throttled: 0, dropped: 0, peakVoices: 0 };

  /** The mode the game asked for, and the one actually playing (they differ before unlock). */
  let wanted: MusicMode = "off";
  let playing: MusicMode = "off";
  let current: Track | null = null;
  const fading: Track[] = [];
  let targetIntensity = 0;
  let intensity = 0;
  let lastTick = 0;

  const countVoices = (now: number) => {
    let active = 0;
    for (let i = 0; i < MAX_VOICES; i++) if (voiceEnds[i] > now) active++;
    return active;
  };

  /** A free effect slot, or -1 when this effect should be dropped. */
  const claimVoice = (now: number, limit: number) => {
    let active = 0;
    let free = -1;
    for (let i = 0; i < MAX_VOICES; i++) {
      if (voiceEnds[i] > now) active++;
      else if (free < 0) free = i;
    }
    if (free < 0 || active >= limit) return -1;
    stats.peakVoices = Math.max(stats.peakVoices, active + 1);
    return free;
  };

  const startTimer = () => {
    if (timer === undefined && !paused && !disposed) timer = setInterval(tick, TICK_MS);
  };

  const stopTimer = () => {
    if (timer !== undefined) clearInterval(timer);
    timer = undefined;
  };

  const retire = (track: Track, now: number) => {
    track.gain.gain.setTargetAtTime(0, now, FADE / 4);
    track.endsAt = now + FADE * 2;
    fading.push(track);
  };

  /** Crossfades from whatever plays to `wanted`. */
  const applyMusic = () => {
    if (!ctx || !mixer || wanted === playing) return;
    playing = wanted;
    const now = ctx.currentTime;
    if (current) retire(current, now);
    current = null;
    if (isLoop(playing)) {
      const gain = ctx.createGain();
      gain.connect(mixer.music);
      gain.gain.setValueAtTime(0, now);
      gain.gain.setTargetAtTime(1, now, FADE / 4);
      intensity = targetIntensity;
      current = { mode: playing, gain, bar: 0, step: 0, barStart: now + 0.05, barIntensity: intensity, endsAt: Infinity };
    } else if (playing === "victory" || playing === "defeat") {
      // let the loop dip before the jingle; afterwards the music stays silent
      const gain = ctx.createGain();
      gain.connect(mixer.music);
      const start = now + 0.15;
      const length = renderStinger(ctx, gain, playing, start);
      current = { mode: playing, gain, bar: 0, step: 0, barStart: start, barIntensity: 0, endsAt: start + length };
    }
  };

  /** Schedules every 16th step of `track` that falls inside the lookahead window. */
  const scheduleAhead = (track: Track, mode: LoopMode, now: number) => {
    if (!ctx) return;
    const sixteenth = 15 / SONGS[mode].bpm;
    const barLength = 16 * sixteenth;
    // Timers were throttled (background tab): jump to the current bar instead of replaying.
    if (track.barStart + barLength <= now) {
      const skipped = Math.floor((now - track.barStart) / barLength);
      track.bar += skipped;
      track.barStart += skipped * barLength;
      track.step = 0;
    }
    const audible = !settings.muted && settings.music > 0;
    let t = track.barStart + track.step * sixteenth;
    while (t < now + LOOKAHEAD) {
      if (track.step === 0) track.barIntensity = intensity;
      // late steps are skipped (never played in a burst); the grid stays intact
      if (audible && t >= now) scheduleMusicBar(ctx, track.gain, mode, track.bar, track.barStart, track.barIntensity, track.step, track.step + 1);
      if (++track.step === 16) {
        track.step = 0;
        track.bar++;
        track.barStart += barLength;
      }
      t = track.barStart + track.step * sixteenth;
    }
  };

  /** The scheduler: applies music changes, smooths intensity, schedules notes, frees faded tracks. */
  function tick() {
    if (!ctx) return;
    try {
      applyMusic();
      const now = ctx.currentTime;
      const dt = clamp(now - lastTick, 0, 1);
      lastTick = now;
      intensity += (targetIntensity - intensity) * (1 - Math.exp(-dt / INTENSITY_TAU));
      if (current) {
        if (isLoop(current.mode)) scheduleAhead(current, current.mode, now);
        else if (now >= current.endsAt) {
          current.gain.disconnect();
          current = null;
        }
      }
      for (let i = fading.length - 1; i >= 0; i--) {
        if (now >= fading[i].endsAt) {
          fading[i].gain.disconnect();
          fading.splice(i, 1);
        }
      }
    } catch {
      // audio must never break the page; the next tick tries again
    }
  }

  /** Runs an AudioContext state change, ignoring both sync throws and rejections. */
  const settle = (change: () => Promise<void>) => {
    try {
      change().catch(() => {});
    } catch {
      // very old WebAudio implementations: nothing else to try
    }
  };

  const resumeContext = () => {
    const c = ctx;
    if (!c || paused || c.state === "running" || c.state === "closed") return;
    settle(() => c.resume());
    // older iOS only opens the output once a sound starts inside the user gesture
    try {
      const blip = c.createBufferSource();
      blip.buffer = c.createBuffer(1, 1, c.sampleRate);
      blip.connect(c.destination);
      blip.onended = () => blip.disconnect();
      blip.start();
    } catch {
      // nothing else to try
    }
  };

  return {
    unlock() {
      if (disposed || failed) return;
      if (!ctx) {
        const w = typeof window === "undefined" ? undefined : (window as unknown as Record<string, AudioContextConstructor | undefined>);
        const Ctor = w?.AudioContext ?? w?.webkitAudioContext;
        if (!Ctor) {
          failed = true;
          return;
        }
        try {
          const created = new Ctor();
          mixer = createMixer(created, settings);
          created.onstatechange = () => {
            if (created.state === "running") ranOnce = true;
          };
          ctx = created;
        } catch {
          failed = true;
          mixer = null;
          return;
        }
        if (ctx.state === "running") ranOnce = true;
        lastTick = ctx.currentTime;
        startTimer();
        tick(); // start the remembered music right away
      }
      resumeContext();
    },

    get unlocked() {
      return ctx !== null && (ranOnce || ctx.state === "running");
    },

    sfx(name, opts) {
      if (!ctx || !mixer || paused || ctx.state !== "running") return;
      if (settings.muted || settings.sfx <= 0) return;
      try {
        const now = ctx.currentTime;
        if (now - (lastPlayed.get(name) ?? -Infinity) < (MIN_INTERVAL[name] ?? 0)) {
          stats.throttled++;
          return;
        }
        const slot = claimVoice(now, voiceLimit(name));
        if (slot < 0) {
          stats.dropped++;
          return;
        }
        const pitch = opts?.pitch ?? (WOBBLE.has(name) ? 1 + (Math.random() * 2 - 1) * 0.04 : 1);
        const length = scheduleSfx(ctx, mixer.sfx, name, now + SFX_LEAD, pitch, opts?.volume ?? 1, opts?.pan ?? 0);
        if (length > 0) {
          lastPlayed.set(name, now);
          voiceEnds[slot] = now + SFX_LEAD + length;
          stats.played++;
        }
      } catch {
        // a sound effect must never break the game
      }
    },

    setMusic(mode) {
      // applied by the next scheduler tick, so a burst of calls costs one crossfade
      if (!disposed) wanted = mode;
    },

    setIntensity(value) {
      if (Number.isFinite(value)) targetIntensity = clamp(value, 0, 1);
    },

    setSettings(next) {
      settings = mergeSettings(settings, next);
      if (!ctx || !mixer) return;
      const now = ctx.currentTime;
      mixer.master.gain.setTargetAtTime(settings.muted ? 0 : 1, now, 0.05);
      mixer.music.gain.setTargetAtTime(musicGain(settings), now, 0.05);
      mixer.sfx.gain.setTargetAtTime(taper(settings.sfx), now, 0.05);
    },

    getSettings() {
      return { ...settings };
    },

    suspend() {
      const c = ctx;
      if (!c || paused) return;
      paused = true;
      stopTimer();
      settle(() => c.suspend());
    },

    resume() {
      if (!ctx || !paused) return;
      paused = false;
      resumeContext();
      lastTick = ctx.currentTime;
      startTimer();
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      stopTimer();
      current = null;
      fading.length = 0;
      voiceEnds.fill(0);
      const c = ctx;
      if (c) {
        mixer?.limiter.disconnect();
        settle(() => c.close());
      }
      ctx = null;
      mixer = null;
    },

    get __debug(): AudioDebug {
      const now = ctx?.currentTime ?? 0;
      return {
        state: ctx?.state ?? "none",
        activeVoices: countVoices(now),
        ...stats,
        music: playing,
        intensity,
        tracks: (current ? 1 : 0) + fading.length,
      };
    },
  };
}
