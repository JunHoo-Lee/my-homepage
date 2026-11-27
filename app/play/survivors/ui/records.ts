/*
 * What the game remembers between visits (localStorage; every access may
 * throw in private modes, so failures just mean "nothing saved").
 */
import type { AudioSettings } from "../contracts";
import type { Grade, RunResult } from "../game";

const BEST_KEY = "gradient-survivors-best";
const AUDIO_KEY = "gradient-survivors-audio";

export type Best = { time: number; kills: number; grade: Grade };

/** Personal bests rank by decision, then time survived, then concerns addressed. */
const GRADE_RANK: Record<Grade, number> = { DeskReject: 0, Reject: 1, Borderline: 2, Accept: 3, Oral: 4 };

const beats = (a: Best, b: Best) => (GRADE_RANK[a.grade] - GRADE_RANK[b.grade] || a.time - b.time || a.kills - b.kills) > 0;

function read(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable: the value lasts for this page view only
  }
}

export function readBest(): Best | null {
  const value = read(BEST_KEY) as Partial<Best> | null;
  if (!value || typeof value.time !== "number" || typeof value.kills !== "number") return null;
  if (typeof value.grade !== "string" || !Object.prototype.hasOwnProperty.call(GRADE_RANK, value.grade)) return null;
  return { time: value.time, kills: value.kills, grade: value.grade };
}

/** Stores the run if it beats the saved best. Returns the best after this run and whether the run set it. */
export function recordBest(result: RunResult): { best: Best; improved: boolean } {
  const previous = readBest();
  const current: Best = { time: result.time, kills: result.kills, grade: result.grade };
  if (previous && !beats(current, previous)) return { best: previous, improved: false };
  write(BEST_KEY, current);
  return { best: current, improved: true };
}

/** Saved audio settings; createAudio() validates every field. */
export function readAudioSettings(): Partial<AudioSettings> | undefined {
  const value = read(AUDIO_KEY);
  return value && typeof value === "object" ? (value as Partial<AudioSettings>) : undefined;
}

export function saveAudioSettings(settings: AudioSettings) {
  write(AUDIO_KEY, settings);
}
