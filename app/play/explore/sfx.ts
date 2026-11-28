// Tiny synthesised sound set: no audio files, everything is oscillators and noise.

import { preferPlayback } from "../shared/playback";

export type Sfx = {
  step(): void;
  dig(): void;
  breakBlock(): void;
  place(): void;
  splash(): void;
  crystal(): void;
  discover(): void;
  travel(): void;
  setMuted(muted: boolean): void;
  resume(): void;
  dispose(): void;
};

const SCALE = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25];

export function createSfx(): Sfx {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let noise: AudioBuffer | null = null;
  let muted = false;
  let musicTimer = 0;

  const ensure = () => {
    if (ctx || typeof window === "undefined") return ctx;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return ctx;
  };

  const burst = (frequency: number, duration: number, gain: number, type: BiquadFilterType = "lowpass") => {
    if (!ctx || !master || !noise || muted) return;
    const source = ctx.createBufferSource();
    source.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(gain, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    source.connect(filter).connect(amp).connect(master);
    source.start(0, Math.random() * 0.2, duration);
  };

  const tone = (frequency: number, duration: number, gain: number, type: OscillatorType = "sine", delay = 0, glide = 1) => {
    if (!ctx || !master || muted) return;
    const at = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, at);
    if (glide !== 1) osc.frequency.exponentialRampToValueAtTime(frequency * glide, at + duration);
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, at);
    amp.gain.exponentialRampToValueAtTime(gain, at + 0.02);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(amp).connect(master);
    osc.start(at);
    osc.stop(at + duration + 0.05);
  };

  // a sparse, slow pentatonic melody so the world never feels silent
  const music = () => {
    if (ctx && ctx.state === "running" && !muted && !document.hidden) {
      const note = SCALE[Math.floor(Math.random() * SCALE.length)] / (Math.random() < 0.35 ? 2 : 1);
      tone(note, 3.2, 0.045, "sine");
      tone(note * 2, 2.4, 0.012, "triangle", 0.02);
      if (Math.random() < 0.4) tone(note * 1.5, 2.8, 0.03, "sine", 0.6);
    }
    musicTimer = window.setTimeout(music, 1800 + Math.random() * 3200);
  };
  if (typeof window !== "undefined") musicTimer = window.setTimeout(music, 2500);

  return {
    step: () => burst(520 + Math.random() * 260, 0.07, 0.1),
    dig: () => burst(900 + Math.random() * 300, 0.05, 0.12),
    breakBlock: () => {
      burst(700, 0.16, 0.3);
      tone(140, 0.12, 0.2, "triangle", 0, 0.5);
    },
    place: () => {
      tone(190, 0.09, 0.25, "triangle", 0, 0.7);
      burst(1400, 0.04, 0.1);
    },
    splash: () => burst(1800, 0.3, 0.2, "bandpass"),
    crystal: () => [0, 1, 2, 3].forEach((i) => tone(880 * Math.pow(1.26, i), 0.5, 0.1, "sine", i * 0.07)),
    discover: () => [0, 2, 4, 7].forEach((i, n) => tone(SCALE[i], 0.9, 0.13, "triangle", n * 0.12)),
    travel: () => tone(220, 0.5, 0.12, "sine", 0, 3),
    setMuted: (next) => {
      muted = next;
      if (master && ctx) master.gain.setTargetAtTime(next ? 0 : 0.5, ctx.currentTime, 0.05);
    },
    resume: () => {
      preferPlayback();
      const context = ensure();
      if (context && context.state === "suspended") void context.resume();
    },
    dispose: () => {
      window.clearTimeout(musicTimer);
      void ctx?.close();
      ctx = null;
    },
  };
}
