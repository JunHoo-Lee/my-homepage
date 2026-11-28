/*
 * Sharing a run: the result is packed into a short, human-readable code that
 * lives in the share URL (/play/survivors/r/<code>). That page renders the
 * decision letter as an Open Graph image, so X and LinkedIn show a card
 * instead of a bare link. Pure module: safe on the server and in the browser.
 */

import { DECISIONS, reviewsFor, type DecisionId } from "./lore";

export const SITE = "https://junhoo.me";

/** Paper cards that can show up on a shared letter, with the short name used in posts. */
export const SHARE_PAPERS: Record<string, string> = {
  dsv: "Deep Support Vectors",
  shot: "SHOT",
  anchors: "Template Infilling",
  acro: "ACRO",
  csf: "CSF",
  rhd: "RHD",
  dsf: "DSF",
  robotuse: "RobotUse",
  reworld: "ReWorld",
};

const GRADE_CODE: Record<DecisionId, string> = { DeskReject: "d", Reject: "r", Borderline: "b", Accept: "a", Oral: "o" };
const CODE_GRADE = Object.fromEntries(Object.entries(GRADE_CODE).map(([grade, code]) => [code, grade])) as Record<string, DecisionId>;

export type ShareData = {
  grade: DecisionId;
  /** seconds survived, 0..300 */
  time: number;
  kills: number;
  level: number;
  maxCombo: number;
  bossDefeated: boolean;
  submission: number;
  /** paper card ids in the build (keys of SHARE_PAPERS) */
  papers: string[];
};

const int = (value: string | undefined, min: number, max: number) => {
  if (!value || !/^\d{1,6}$/.test(value)) return null;
  const n = Number(value);
  return n >= min && n <= max ? n : null;
};

/** e.g. "o-300-204-9-22-1-4753-dsv.shot" */
export function encodeShare(data: ShareData) {
  const papers = data.papers.filter((id) => id in SHARE_PAPERS).join(".");
  return [
    GRADE_CODE[data.grade],
    Math.floor(data.time),
    data.kills,
    data.level,
    data.maxCombo,
    data.bossDefeated ? 1 : 0,
    data.submission,
    papers,
  ].join("-");
}

export function decodeShare(code: string): ShareData | null {
  const parts = decodeURIComponent(code).split("-");
  if (parts.length < 7 || parts.length > 8) return null;
  const grade = CODE_GRADE[parts[0]];
  const time = int(parts[1], 0, 300);
  const kills = int(parts[2], 0, 99999);
  const level = int(parts[3], 1, 999);
  const maxCombo = int(parts[4], 0, 99999);
  const boss = int(parts[5], 0, 1);
  const submission = int(parts[6], 1000, 9999);
  if (!grade || time === null || kills === null || level === null || maxCombo === null || boss === null || submission === null) return null;
  const papers = (parts[7] ?? "").split(".").filter((id) => id in SHARE_PAPERS);
  return { grade, time, kills, level, maxCombo, bossDefeated: boss === 1, submission, papers: [...new Set(papers)].slice(0, 9) };
}

export const sharePath = (data: ShareData) => `/play/survivors/r/${encodeShare(data)}`;

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

/** Decision title without emoji (the OG renderer has no emoji font). */
export const plainTitle = (grade: DecisionId) => DECISIONS[grade].title.replace(/\s*\p{Extended_Pictographic}/gu, "").trim();

/** One line about the run, in reviewer-speak. */
export function headline(data: ShareData) {
  switch (data.grade) {
    case "Oral":
      return "Reviewer 2 raised their score to 6. This almost never happens.";
    case "Accept":
      return "Survived until the AoE deadline. Reviewer 2 stayed at 3, confidence 5.";
    case "Borderline":
      return "Reviewer 2 showed up. The AC is still reading my rebuttal.";
    case "Reject":
      return `Rejected at ${clock(data.time)}. Reviewer 2: "The novelty is limited."`;
    case "DeskReject":
      return `Desk rejected in ${clock(data.time)}. Nobody opened the PDF.`;
  }
}

/** The post text for X / LinkedIn / the share sheet (the URL is added separately). */
export function shareText(data: ShareData) {
  const title = plainTitle(data.grade);
  const trophy = data.grade === "Oral" ? " 🏆" : data.grade === "DeskReject" ? " 🫠" : "";
  const papers = data.papers.length ? ` Built with ${data.papers.map((id) => SHARE_PAPERS[id]).join(" + ")}.` : "";
  return `Submission #${data.submission}: ${title}${trophy}\n${headline(data)}${papers}\nCan you survive Reviewer 2?`;
}

// ------------------------------------------------------------------ the review thread
// The decision as a thread on a review forum: the area chair's note, then one
// reply per official review. Shared by the letter in the game and its image.

// The area chair's note, laid out like a forum post on a review site. The texts are terse
// the way real ones are (scores, initials for the reviewers), with a community in-joke here
// and there. {s} is the scores.
const METAREVIEWS: Record<DecisionId, string[]> = {
  DeskReject: [
    "Exceeds the page limit by one line.",
    "Not anonymized (acknowledgements left in the PDF).",
    "Wrong style file. This is last year's template.",
    "Out of scope for the venue.",
  ],
  Reject: [
    "Scores {s}. No reviewer changed their score after the rebuttal.",
    "Scores {s}. I agree with Reviewer 2.",
    "Scores {s}. Limited novelty. R2 also asks the authors to cite [1-7].",
    "Scores {s}. The authors are encouraged to compare with more baselines.",
  ],
  Borderline: [
    "Scores {s}. Split reviews, no consensus in the discussion. Deferring to the SAC.",
    "Scores {s}. R3 did not respond during the discussion. Could go either way.",
    "Scores {s}. The reviewers did not reply to the rebuttal. Neither did I.",
  ],
  Accept: [
    "Scores {s}. R2 did not update, but the majority is positive.",
    "Scores {s}. R2 still disagrees. R2 always disagrees.",
    "Scores {s}. Please fix the remaining concerns for camera-ready.",
  ],
  Oral: [
    "Scores {s}. All reviewers positive after the rebuttal, R2 raised to 6.",
    "Scores {s}. R2 raised their score. I have not seen this before.",
    "Scores {s}. Unanimous after the rebuttal. Nominated for oral.",
  ],
};
const ID_CHARS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const ratingLabel = (score: number) =>
  score <= 2 ? "strong reject" : score <= 4 ? "reject, not good enough" : score === 5 ? "marginally below threshold" : score === 6 ? "marginally above threshold" : score <= 8 ? "accept, good paper" : "strong accept";

export type ForumThread = {
  /** note title, e.g. "Meta Review of Submission4702 by Area Chair xK3f" */
  title: string;
  signature: string;
  /** "Metareview", or "Desk Reject Comments" when nobody reviewed the paper */
  field: string;
  text: string;
  reviews: { title: string; signature: string; rating: string; confidence: number; comment: string }[];
  /** the line under a note with no replies */
  empty: string;
};

export function forumThread(data: ShareData): ForumThread {
  const n = data.submission;
  const id = (salt: number) => [0, 1, 2, 3].map((i) => ID_CHARS[(n * (i * 7 + 3 + salt) + i * 11 + salt * 5) % ID_CHARS.length]).join("");
  const desk = data.grade === "DeskReject";
  const reviews = desk
    ? []
    : reviewsFor({ time: data.time, level: data.level, kills: data.kills, maxCombo: data.maxCombo, bossDefeated: data.bossDefeated, runLength: 300 });
  const options = METAREVIEWS[data.grade];
  const seconds = Math.floor(data.time);
  return {
    title: `Meta Review of Submission${n} by Area Chair ${id(0)}`,
    signature: `Meta Review · Area Chair ${id(0)} · 23:59 AoE · Everyone`,
    field: desk ? "Desk Reject Comments" : "Metareview",
    text: options[n % options.length].replace("{s}", reviews.map((r) => r.score).join("/")),
    reviews: reviews.map((r, i) => ({
      title: `Official Review of Submission${n} by ${r.reviewer}`,
      signature: `Reviewer ${id(i + 1)} · Everyone`,
      rating: `${r.score}: ${ratingLabel(r.score)}`,
      confidence: r.confidence,
      comment: r.comment,
    })),
    empty: `0 Replies · no official reviews · decided in ${seconds} second${seconds === 1 ? "" : "s"}`,
  };
}
