/*
 * Sharing a run: the result is packed into a short, human-readable code that
 * lives in the share URL (/play/survivors/r/<code>). That page renders the
 * decision letter as an Open Graph image, so X and LinkedIn show a card
 * instead of a bare link. Pure module: safe on the server and in the browser.
 */

import { DECISIONS, type DecisionId } from "./lore";

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
