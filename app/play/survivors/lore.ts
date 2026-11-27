/*
 * All the peer-review jokes in one place, so the game, the sprites and the UI
 * tell the same story: you are a paper (well, a tiny model) under review.
 *
 *   HP      -> Sanity
 *   XP      -> Citations, level -> h-index
 *   Timer   -> the AoE deadline
 *   Bugs    -> NaNs, overfitting, hallucinations ... and reviewer comments
 *   Boss    -> Reviewer 2 (Score: 3, Confidence: 5)
 *   Result  -> a decision letter with reviewer scores and a rubber stamp
 */

import type { CardIconId } from "./contracts";

/** Short reviewer comments carried by "comment" enemies (speech bubbles). Keep each <= 12 chars. */
export const REVIEW_COMMENTS = [
  "Not novel",
  "Ablation?",
  "SOTA?",
  "Cite [37]",
  "Typo, L42",
  "Baselines?",
  "Unclear",
  "More exps",
  "Incremental",
  "Seeds?",
  "Fig. 3 tiny",
  "Just prompt?",
] as const;

/** Reviewer 2's speech bubbles while healthy, cycled in random order. */
export const REVIEWER2_QUOTES = [
  "The novelty is limited.",
  "Have you tried a bigger model?",
  "Please cite Reviewer 2 et al. (2019).",
  "I am not convinced.",
  "Missing an ablation on the random seed.",
  "Score: 3. Confidence: 5.",
  "This is just attention with extra steps.",
  "The writing could be improved.",
  "Why not compare with my method?",
  "The gains are within noise.",
  "Did you try it on ImageNet?",
] as const;

/** Reviewer 2 below half HP: the rebuttal made it worse. */
export const REVIEWER2_ENRAGED = [
  "I have read the rebuttal. Score unchanged.",
  "Please add 12 more experiments.",
  "Strong reject. Confidence: 5.",
  "The authors did not address my concerns.",
] as const;

/** Reviewer 2's last words when defeated. */
export const REVIEWER2_DEFEATED = "...Fine. I raise my score to 6.";

/** One-line jokes shown under each upgrade card's effect text. */
export const CARD_FLAVOR: Record<CardIconId, string> = {
  gradient: "Just backprop harder.",
  dsv: "If deep nets are SVMs, where are their support vectors?",
  dropout: "Ignore 20% of your problems. Randomly.",
  attention: "Attention is all you need (to aim).",
  shot: "GBML was suppressing the Hessian all along.",
  looped: "Its output is its next input.",
  anchors: "Global blueprint first. No prefix required.",
  adam: "β₁ = 0.9. Nobody has ever tuned it.",
  decay: "Regularize your sanity.",
  context: "A 128k-token pickup window.",
  mixed: "fp16: faster, with only a few more NaNs.",
  anyway: "Same greedy pick, more candidates.",
  acro: "Same policy. Better place to resume.",
  csf: "No weights, no watermark. Just oddly specific prompts.",
  rhd: "The strong agent writes it; the light agent debugs it.",
  dsf: "“What I cannot create, I do not understand.” —Feynman",
  robotuse: "Computer Use had a harness. Now robots do too.",
  reworld: "Simulate, diff, then commit to the live world.",
  checkpoint: "You did save a checkpoint, right?",
};

export const TOASTS = {
  runStart: (id: number) => `Submission #${id} received. Good luck.`,
  bossWarning: "⚠ Reviewer 2 has been assigned to your paper",
  bossSpawn: "Reviewer 2 has entered the chat",
  bossDefeated: "Reviewer 2 raised their score to 6. Weak accept! 🏆",
  revive: "ACRO: the critic picked a re-entry point. Resuming ⟲",
  magnet: "Your thread went viral: citations incoming 📣",
  coffee: "☕ Coffee break: +30 sanity",
  oneMinute: "1:00 until the AoE deadline!",
  deadline: "Deadline passed. Reviews are final.",
  combo: {
    25: "25 concerns addressed in a row!",
    50: "Rebuttal speedrun: 50 combo",
    100: "The reviewers are speechless: 100 combo",
    200: "Best paper energy: 200 combo",
  } as Record<number, string>,
} as const;

/** HUD vocabulary. */
export const HUD_TERMS = {
  hp: "Sanity",
  level: "h-index",
  xp: "citations",
  kills: "concerns addressed",
  /** The kill counter's label for a count of n ("1 concern addressed"). */
  killsLabel: (n: number) => (n === 1 ? "concern addressed" : "concerns addressed"),
  timer: "AoE",
  bossIn: (time: string) => `Reviewer 2 assigned in ${time}`,
  bossActive: "Reviewer 2 is reviewing",
  afterBoss: "until reviews are final",
  bossBar: "Reviewer 2 · Score 3 · Confidence 5",
} as const;

export const SCREENS = {
  /** The title card is the first page of a paper under review. */
  runningHead: "Under double-blind review · Do not distribute",
  titleKicker: (id: number) => `Submission #${id} · Track: Survival`,
  title: "Gradient Survivors",
  authors: "Anonymous Author(s)",
  pitch:
    "You are a tiny model under peer review. NaNs, overfitting, hallucinations and reviewer comments swarm in. At 2:30 Reviewer 2 is assigned to your paper. Survive until the 5:00 AoE deadline to get accepted.",
  controlsCaption: "Table 1: Controls.",
  bestSoFar: "Best decision so far",
  levelUpKicker: "Rebuttal period",
  levelUpTitle: "Address one concern",
  pausedKicker: (id: number | null) => `Submission #${id ?? "—"} · Status: under review`,
  paused: "Paused: coffee break ☕",
  withdraw: "Withdraw & resubmit",
  decisionKicker: (id: number | null) => `Decision · Submission #${id ?? "—"}`,
} as const;

export type DecisionId = "DeskReject" | "Reject" | "Borderline" | "Accept" | "Oral";

/** The decision letter for each grade. */
export const DECISIONS: Record<DecisionId, { stamp: string; title: string; metaReview: string }> = {
  DeskReject: {
    stamp: "DESK REJECT",
    title: "Desk reject",
    metaReview: "Desk rejected before any reviewer opened the PDF: it did not survive the formatting check. Please read the call for papers.",
  },
  Reject: {
    stamp: "REJECTED",
    title: "Reject",
    metaReview: "The AC agrees with Reviewer 2. The concerns were not addressed before the deadline.",
  },
  Borderline: {
    stamp: "BORDERLINE",
    title: "Borderline (AC to decide)",
    metaReview: "Reviewer 2 arrived and the discussion got heated. The AC is still reading the rebuttal.",
  },
  Accept: {
    stamp: "ACCEPTED",
    title: "Accept (poster)",
    metaReview: "You survived the whole review period. See you at the poster session.",
  },
  Oral: {
    stamp: "ORAL",
    title: "Accept (oral) 🏆",
    metaReview: "You survived and convinced Reviewer 2. This almost never happens.",
  },
};

/** Inputs for the three fake reviews on the results screen. */
export type ReviewInputs = { time: number; level: number; kills: number; maxCombo: number; bossDefeated: boolean; runLength: number };

export type Review = { reviewer: string; score: number; confidence: number; comment: string };

/** Three reviews generated from a run. Reviewer 2 is always Reviewer 2. */
export function reviewsFor(run: ReviewInputs): Review[] {
  const clamp = (n: number) => Math.max(1, Math.min(10, Math.round(n)));
  const survivedShare = Math.min(1, run.time / run.runLength);
  return [
    {
      reviewer: "Reviewer 1",
      score: clamp(3 + survivedShare * 5 + (run.bossDefeated ? 1 : 0)),
      confidence: 3,
      comment: survivedShare >= 1 ? "Solid survival. Minor typos." : "Promising, but it ends too early.",
    },
    {
      reviewer: "Reviewer 2",
      score: run.bossDefeated ? 6 : 3,
      confidence: 5,
      comment: run.bossDefeated ? "I raise my score to 6." : "The novelty is limited.",
    },
    {
      reviewer: "Reviewer 3",
      score: clamp(3 + run.level / 3 + (run.maxCombo >= 50 ? 1 : 0)),
      confidence: 2,
      comment: run.kills > 500 ? "Impressive scale. I did not read the appendix." : "I did not read the appendix.",
    },
  ];
}

/** A stable-looking submission number for one page view. */
export function submissionId(seed = Math.random()) {
  return 1000 + Math.floor(seed * 9000);
}
