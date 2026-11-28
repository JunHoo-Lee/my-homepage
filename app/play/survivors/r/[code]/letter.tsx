/* The decision letter as an Open Graph image (rendered by next/og, so: flexbox only, no emoji). */

import { ImageResponse } from "next/og";

import { DECISIONS, reviewsFor } from "../../lore";
import { PALETTE } from "../../contracts";
import { SHARE_PAPERS, decodeShare, plainTitle, type ShareData } from "../../share";

export const OG_SIZE = { width: 1200, height: 630 };

const STAMP_COLOR = { Oral: PALETTE.purple, Accept: PALETTE.green, Borderline: PALETTE.gold, Reject: PALETTE.red, DeskReject: PALETTE.red } as const;
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// The area chair's note, laid out like a forum post on a review site. The texts are terse
// the way real ones are (scores, initials for the reviewers), with a community in-joke here
// and there. {s} is the scores.
const METAREVIEWS: Record<ShareData["grade"], string[]> = {
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
const AC_ID_CHARS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
// near-black titles, grey signatures, dark red field names: no accent colours beyond that
const FORUM = { title: "#1f2328", label: "#8c1b13", meta: "#6b6b6b", rule: "#dcdcdc", text: "#1f2328" };
const ratingLabel = (score: number) =>
  score <= 2 ? "strong reject" : score <= 4 ? "reject, not good enough" : score === 5 ? "marginally below threshold" : score === 6 ? "marginally above threshold" : score <= 8 ? "accept, good paper" : "strong accept";

/** "Label: value" the way a forum note prints its fields. */
function Field({ label, value, size = 19 }: { label: string; value: string; size?: number }) {
  return (
    <span style={{ display: "flex", fontSize: size, color: FORUM.text }}>
      <span style={{ display: "flex", fontWeight: 700, color: FORUM.label, marginRight: 7 }}>{label}:</span>
      <span style={{ display: "flex" }}>{value}</span>
    </span>
  );
}

// Flat on purpose: a plain white page with hairlines and an indented reply
// thread, like a screenshot of the forum pasted into the letter.
function Forum({ data }: { data: ShareData }) {
  const n = data.submission;
  const id = (salt: number) => [0, 1, 2, 3].map((i) => AC_ID_CHARS[(n * (i * 7 + 3 + salt) + i * 11 + salt * 5) % AC_ID_CHARS.length]).join("");
  const acId = id(0);
  const options = METAREVIEWS[data.grade];
  const desk = data.grade === "DeskReject";
  const reviews = desk
    ? []
    : reviewsFor({ time: data.time, level: data.level, kills: data.kills, maxCombo: data.maxCombo, bossDefeated: data.bossDefeated, runLength: 300 });
  const seconds = Math.floor(data.time);
  return (
    <div style={{ display: "flex", flexDirection: "column", marginTop: 6, background: "#fff", border: `1px solid ${FORUM.rule}`, padding: "8px 18px 9px" }}>
      <div style={{ display: "flex", fontSize: 22, fontWeight: 700, color: FORUM.title }}>Meta Review of Submission{n} by Area Chair {acId}</div>
      <div style={{ display: "flex", fontSize: 15, color: FORUM.meta, marginTop: 1 }}>
        Meta Review · Area Chair {acId} · 23:59 AoE · Everyone
      </div>
      <div style={{ display: "flex", marginTop: 5 }}>
        <Field label={desk ? "Desk Reject Comments" : "Metareview"} value={options[n % options.length].replace("{s}", reviews.map((r) => r.score).join("/"))} size={20} />
      </div>
      {desk ? (
        <div style={{ display: "flex", fontSize: 16, color: FORUM.meta, marginTop: 8, paddingTop: 7, borderTop: `1px solid ${FORUM.rule}` }}>
          0 Replies · no official reviews · decided in {seconds} second{seconds === 1 ? "" : "s"}
        </div>
      ) : (
        reviews.map((r, i) => (
          <div key={r.reviewer} style={{ display: "flex", flexDirection: "column", marginTop: 6, paddingTop: 5, borderTop: `1px solid ${FORUM.rule}` }}>
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 14, paddingLeft: 12, borderLeft: `3px solid ${FORUM.rule}` }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ display: "flex", fontSize: 18, fontWeight: 700, color: FORUM.title }}>Official Review of Submission{n} by {r.reviewer}</span>
                <span style={{ display: "flex", fontSize: 14, color: FORUM.meta }}>Reviewer {id(i + 1)} · Everyone</span>
              </div>
              <div style={{ display: "flex", gap: 18 }}>
                <Field label="Rating" value={`${r.score}: ${ratingLabel(r.score)}`} size={17} />
                <Field label="Confidence" value={String(r.confidence)} size={17} />
                <Field label="Comment" value={r.comment} size={17} />
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function Letter({ data }: { data: ShareData }) {
  const stampColor = STAMP_COLOR[data.grade];
  const stats = [
    ["SURVIVED", clock(data.time)],
    ["CONCERNS ADDRESSED", data.kills.toLocaleString("en-US")],
    ["H-INDEX", String(data.level)],
    ["MAX COMBO", `${data.maxCombo}x`],
  ];
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", background: PALETTE.sand, padding: 36, fontFamily: "sans-serif" }}>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: PALETTE.paper,
          border: `4px solid ${PALETTE.ink}`,
          borderRadius: 24,
          boxShadow: `0 10px 0 ${PALETTE.ink}`,
          padding: "26px 44px 22px",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", height: 10, position: "absolute", left: 0, right: 0, top: 0, background: `repeating-linear-gradient(135deg, ${PALETTE.red} 0 22px, ${PALETTE.paper} 22px 34px, ${PALETTE.blue} 34px 56px, ${PALETTE.paper} 56px 68px)`, borderRadius: "20px 20px 0 0" }} />
        <div style={{ display: "flex", color: PALETTE.blue, fontSize: 22, fontWeight: 700, letterSpacing: 3, marginTop: 6 }}>
          DECISION · SUBMISSION #{data.submission}
        </div>
        <div style={{ display: "flex", fontSize: 40, fontWeight: 800, color: PALETTE.ink, marginTop: 2 }}>{plainTitle(data.grade)}</div>
        <div
          style={{
            display: "flex",
            position: "absolute",
            right: 44,
            top: 34,
            border: `6px solid ${stampColor}`,
            borderRadius: 12,
            color: stampColor,
            fontSize: 40,
            fontWeight: 900,
            letterSpacing: 4,
            padding: "4px 18px",
            transform: "rotate(-9deg)",
            opacity: 0.85,
          }}
        >
          {DECISIONS[data.grade].stamp}
        </div>

        <Forum data={data} />

        <div style={{ display: "flex", gap: 14, marginTop: "auto" }}>
          {stats.map(([label, value]) => (
            <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", border: `3px solid ${PALETTE.ink}`, borderRadius: 14, padding: "3px 0 5px" }}>
              <span style={{ fontSize: 30, fontWeight: 800, color: PALETTE.ink }}>{value}</span>
              <span style={{ fontSize: 14, letterSpacing: 2, color: "#666" }}>{label}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 21, color: "#666" }}>
          <span style={{ display: "flex" }}>{data.papers.length ? `Papers in my build: ${data.papers.map((id) => SHARE_PAPERS[id]).join(" · ")}` : "A survivors-like about peer review"}</span>
          <span style={{ display: "flex", fontWeight: 700, color: PALETTE.blue }}>junhoo.me/play</span>
        </div>
      </div>
    </div>
  );
}

export async function letterImage(params: Promise<{ code: string }>) {
  const { code } = await params;
  const data = decodeShare(code) ?? { grade: "Accept" as const, time: 300, kills: 0, level: 1, maxCombo: 0, bossDefeated: false, submission: 1000, papers: [] };
  return new ImageResponse(<Letter data={data} />, OG_SIZE);
}
