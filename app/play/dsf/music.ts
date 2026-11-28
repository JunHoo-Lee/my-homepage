/*
 * Music, ambience and the world's own sounds. Everything is generated.
 *
 * The music is an eight-bar loop in D major pentatonic at 66 bpm that grows
 * with what the player has understood: the sea alone, then broken chords,
 * then roots, then the melody in two halves. A 25 ms timer schedules notes
 * 150 ms ahead on the audio clock. Voices go to their own bus with a feedback
 * delay, well under the effects.
 */

import type { Synth } from "../shared/synth";

const BEAT = 60 / 66;
const BAR = BEAT * 4;
const EIGHTH = BEAT / 2;
const AHEAD = 0.15;

const N: Record<string, number> = {
  G2: 98.0,
  A2: 110.0,
  B2: 123.47,
  D3: 146.83,
  G3: 196.0,
  A3: 220.0,
  B3: 246.94,
  D4: 293.66,
  E4: 329.63,
  Fs4: 369.99,
  A4: 440.0,
  B4: 493.88,
  D5: 587.33,
  E5: 659.25,
  Fs5: 739.99,
  A5: 880.0,
};

/** Dadd9, Bm7, Gadd9, Asus4: two bars each. */
const CHORDS = [
  [N.D3, N.A3, N.E4, N.Fs4],
  [N.B3, N.D4, N.Fs4, N.A4],
  [N.G3, N.B3, N.D4, N.A4],
  [N.A3, N.D4, N.E4, N.A4],
];
const BROKEN = [
  [0, 1, 2, 3, 2, 1, 2, 1],
  [0, 2, 1, 3, 2, 3, 1, 2],
];
const ROOTS = [N.D3, N.D3, N.B2, N.B2, N.G2, N.G2, N.A2, N.A2];
const PINGS = [N.A4, N.Fs4, N.D5, N.B4];
/** [bar, beat, frequency, beats held] */
const MELODY_A: [number, number, number, number][] = [
  [0, 0, N.Fs5, 4],
  [1, 0, N.E5, 2],
  [1, 2, N.D5, 2],
  [2, 0, N.B4, 2],
  [2, 2, N.D5, 2],
  [3, 0, N.A4, 4],
];
const MELODY_B: [number, number, number, number][] = [
  [4, 0, N.A5, 2],
  [4, 2, N.Fs5, 2],
  [5, 0, N.E5, 4],
  [6, 0, N.D5, 2],
  [6, 2, N.B4, 2],
  [7, 0, N.D5, 4],
];

export type MusicMode = "layers" | "sea" | "full";

export type Music = {
  /** How many ruins are understood (0 to 5): sets the layers. */
  setInsights(count: number): void;
  setMode(mode: MusicMode): void;
  /** 0 far from the water, 1 at the coast. */
  setCoast(nearness: number): void;
  dispose(): void;
};

export function createMusic(synth: Synth): Music {
  let insights = 0;
  let mode: MusicMode = "layers";
  let coast = 0;
  let disposed = false;
  let timer: number | null = null;

  let ctx: AudioContext | null = null;
  let bus: GainNode | null = null;
  let seaGain: GainNode | null = null;
  let seaSource: AudioBufferSourceNode | null = null;
  /** Audio time of bar 0, eighth 0 of the loop being scheduled. */
  let origin = 0;
  /** Next eighth to schedule, counted from `origin`. */
  let cursor = 0;
  let fullLoops = 0;

  function build() {
    const audio = synth.audio();
    if (!audio || ctx) return;
    ctx = audio.ctx;
    bus = ctx.createGain();
    bus.gain.value = 0.3;
    bus.connect(audio.out);
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.33;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.35;
    const damp = ctx.createBiquadFilter();
    damp.type = "lowpass";
    damp.frequency.value = 2000;
    bus.connect(delay);
    delay.connect(damp);
    damp.connect(feedback);
    feedback.connect(delay);
    damp.connect(audio.out);

    // the sea: band-passed noise that swells
    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    seaSource = ctx.createBufferSource();
    seaSource.buffer = buffer;
    seaSource.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 500;
    band.Q.value = 0.8;
    seaGain = ctx.createGain();
    seaGain.gain.value = 0;
    seaSource.connect(band).connect(seaGain).connect(audio.out);
    seaSource.start();
    origin = ctx.currentTime + 0.1;
    cursor = 0;
  }

  function voice(freq: number, at: number, decay: number, gain: number, type: OscillatorType = "triangle") {
    if (!ctx || !bus) return;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(gain, at + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    env.connect(bus);
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(env);
    osc.start(at);
    osc.stop(at + decay + 0.05);
    if (type === "triangle") {
      // a quiet sine an octave up gives the bell its air
      const air = ctx.createOscillator();
      const airGain = ctx.createGain();
      airGain.gain.value = 0.25;
      air.type = "sine";
      air.frequency.value = freq * 2;
      air.connect(airGain).connect(env);
      air.start(at);
      air.stop(at + decay + 0.05);
    }
  }

  function schedule(eighth: number, at: number) {
    const inLoop = eighth % 64;
    const bar = Math.floor(inLoop / 8);
    const step = inLoop % 8;
    const full = mode === "full";
    const level = mode === "sea" ? 0 : full ? 5 : insights;

    if (step === 0) voice(PINGS[bar % 4], at, 1.6, 0.11);
    if (level >= 1) {
      const chord = CHORDS[Math.floor(bar / 2)];
      voice(chord[BROKEN[bar % 2][step]], at, 1.2, step === 0 ? 0.1 : 0.07);
    }
    if (level >= 2 && step === 0) voice(ROOTS[bar], at, BAR * 0.95, 0.16, "sine");
    const melody = (notes: [number, number, number, number][]) => {
      for (const [noteBar, beat, freq, held] of notes) {
        if (noteBar !== bar || beat * 2 !== step) continue;
        voice(freq, at, Math.min(1.6, 0.9 + held * 0.2), 0.13);
        if (full) voice(freq * 2, at, 1.2, 0.05);
      }
    };
    if (level >= 4) melody(MELODY_A);
    if (level >= 5) melody(MELODY_B);
    if (full && inLoop === 63) {
      fullLoops += 1;
      if (fullLoops >= 2) mode = "layers";
    }
  }

  function tick() {
    if (disposed) return;
    if (!ctx) build();
    if (!ctx || !seaGain) return;
    const now = ctx.currentTime;
    if (synth.muted || ctx.state !== "running") {
      seaGain.gain.setTargetAtTime(0, now, 0.05);
      // stay in time while silent, so the loop does not rush to catch up afterwards
      while (origin + cursor * EIGHTH < now + AHEAD) cursor += 1;
      return;
    }
    // the swell: one slow breath every 2.2 s, a little louder near the water
    const swell = 0.6 + 0.4 * Math.sin((now / 2.2) * Math.PI * 2);
    seaGain.gain.setTargetAtTime(0.02 * (1 + 0.6 * coast) * swell * 2, now, 0.1);
    while (origin + cursor * EIGHTH < now + AHEAD) {
      const at = origin + cursor * EIGHTH;
      if (at >= now) schedule(cursor, at);
      cursor += 1;
    }
  }

  function start() {
    if (timer === null && !disposed) timer = window.setInterval(tick, 25);
  }
  function stop() {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
    if (ctx && seaGain) seaGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
  }
  function onVisibility() {
    if (document.hidden) stop();
    else start();
  }
  document.addEventListener("visibilitychange", onVisibility);
  if (!document.hidden) start();

  return {
    setInsights(count) {
      insights = Math.max(0, Math.min(5, count));
    },
    setMode(next) {
      if (next === "full" && mode !== "full" && ctx) {
        // the full theme enters on its first bar
        origin = ctx.currentTime + 0.12;
        cursor = 0;
        fullLoops = 0;
      }
      mode = next;
    },
    setCoast(nearness) {
      coast = Math.max(0, Math.min(1, nearness));
    },
    dispose() {
      disposed = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      try {
        seaSource?.stop();
        seaSource?.disconnect();
        seaGain?.disconnect();
        bus?.disconnect();
      } catch {
        /* the context may already be closed */
      }
      ctx = null;
      bus = null;
      seaGain = null;
      seaSource = null;
    },
  };
}

/** The world's own sounds. Each has a visual twin in the engine. */
export function createSounds(synth: Synth) {
  let foot = false;
  return {
    step() {
      foot = !foot;
      synth.noise({ dur: 0.03, gain: 0.025, freq: foot ? 900 : 1300 });
    },
    wake() {
      synth.tone({ freq: 440, dur: 0.22, gain: 0.07 });
      synth.tone({ freq: 587, dur: 0.3, gain: 0.07, delay: 0.24 });
    },
    mote() {
      synth.arp([587, 880, 1175], 0.14, { dur: 0.3, gain: 0.08, type: "triangle" });
    },
    tide() {
      synth.noise({ dur: 0.6, gain: 0.07, freq: 900, to: 300 });
    },
    lamp() {
      synth.arp([587, 740, 880, 1175], 0.09, { dur: 0.32, gain: 0.09, type: "triangle" });
    },
    five() {
      synth.arp([294, 440, 587], 0.11, { dur: 0.4, gain: 0.1, type: "triangle" });
    },
    petrify() {
      synth.noise({ dur: 0.06, gain: 0.1, freq: 200 });
      synth.tone({ freq: 120, to: 80, dur: 0.25, gain: 0.12 });
    },
    door() {
      synth.tone({ freq: 80, to: 50, dur: 1.2, gain: 0.16 });
      synth.noise({ dur: 1.1, gain: 0.04, freq: 220, to: 120 });
      for (const [index, freq] of [293.66, 369.99, 440, 587.33].entries()) {
        synth.tone({ freq, dur: 1.4, gain: 0.07, type: "triangle", delay: 1.15 + index * 0.03 });
      }
    },
  };
}
