/* The decision letter as an Open Graph image (rendered by next/og, so: flexbox only, no emoji). */

import { ImageResponse } from "next/og";

import { DECISIONS, reviewsFor } from "../../lore";
import { PALETTE } from "../../contracts";
import { SHARE_PAPERS, decodeShare, plainTitle, type ShareData } from "../../share";

export const OG_SIZE = { width: 1200, height: 630 };

const STAMP_COLOR = { Oral: PALETTE.purple, Accept: PALETTE.green, Borderline: PALETTE.gold, Reject: PALETTE.red, DeskReject: PALETTE.red } as const;
const scoreColor = (score: number) => (score <= 3 ? PALETTE.red : score <= 5 ? PALETTE.orange : score === 6 ? PALETTE.gold : PALETTE.green);
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// The area chair's note, laid out like a forum post on a review site. The texts are the
// boilerplate every author has received at least once; one is picked per submission number.
const METAREVIEWS: Record<ShareData["grade"], string[]> = {
  DeskReject: [
    "This submission does not follow the formatting instructions. Rejected without review.",
    "The submission exceeds the page limit and is desk rejected without further review.",
    "Out of scope for this venue. We encourage the authors to submit elsewhere.",
    "Due to the record number of submissions, this paper was not sent out for review.",
  ],
  Reject: [
    "The reviewers raised concerns about novelty. The rebuttal did not change their minds.",
    "I have read the reviews and the rebuttal, and I agree with Reviewer 2.",
    "Not ready for publication in its current form. We encourage a resubmission.",
    "Reviews are mixed, but the most confident reviewer is negative.",
  ],
  Borderline: [
    "A borderline paper. The reviewers did not reach a consensus during the discussion.",
    "The paper has merits and weaknesses. The program chairs will make the final call.",
    "Reviewer 2 was not convinced by the rebuttal. The other reviewers did not respond.",
  ],
  Accept: [
    "The reviewers are generally positive. Reviewer 2 remains unconvinced.",
    "All concerns except Reviewer 2's were addressed in the rebuttal.",
    "A solid paper. Please address the remaining comments in the camera-ready version.",
  ],
  Oral: [
    "All reviewers agree, including Reviewer 2, who raised their score after the rebuttal.",
    "A clear accept. Reviewer 2 raised their score, which the AC notes is rare.",
    "Strong consensus after the rebuttal. Recommended for an oral presentation.",
  ],
};
const AC_ID_CHARS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const FORUM = { title: "#3e6775", label: "#8c1b13", meta: "#8a8a8a", line: "#d9d4c7", text: "#2b2b2b" };

function Badge({ children }: { children: string }) {
  return <span style={{ display: "flex", background: FORUM.label, color: "#fff", borderRadius: 3, padding: "1px 8px", fontSize: 15, fontWeight: 700 }}>{children}</span>;
}

function Forum({ data, accent }: { data: ShareData; accent: string }) {
  const n = data.submission;
  const acId = [0, 1, 2, 3].map((i) => AC_ID_CHARS[(n * (i * 7 + 3) + i * 11) % AC_ID_CHARS.length]).join("");
  const options = METAREVIEWS[data.grade];
  const desk = data.grade === "DeskReject";
  const reviews = desk
    ? []
    : reviewsFor({ time: data.time, level: data.level, kills: data.kills, maxCombo: data.maxCombo, bossDefeated: data.bossDefeated, runLength: 300 });
  const seconds = Math.floor(data.time);
  const fields: [string, string][] = [
    ["Metareview", options[n % options.length]],
    ["Recommendation", plainTitle(data.grade)],
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", marginTop: 8, gap: 6 }}>
      <div style={{ display: "flex", flexDirection: "column", background: "#fff", border: `1.5px solid ${FORUM.line}`, borderLeft: `7px solid ${accent}`, borderRadius: 6, padding: "10px 20px 11px" }}>
        <div style={{ display: "flex", fontSize: 24, fontWeight: 700, color: FORUM.title }}>Meta Review of Submission{n} by Area Chair {acId}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 16, color: FORUM.meta, marginTop: 3 }}>
          <Badge>Meta Review</Badge>
          <span style={{ display: "flex" }}>Area Chair {acId} · 23:59 AoE · Readers: Everyone</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 7 }}>
          {fields.map(([label, value]) => (
            <div key={label} style={{ display: "flex", fontSize: 20, color: FORUM.text }}>
              <span style={{ display: "flex", fontWeight: 700, color: FORUM.label, marginRight: 8 }}>{label}:</span>
              <span style={{ display: "flex" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
      {/* replies in the thread: one line per official review */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginLeft: 26 }}>
        {desk ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 19, color: FORUM.meta, background: "#fff", border: `1.5px solid ${FORUM.line}`, borderRadius: 6, padding: "5px 14px" }}>
            <span style={{ display: "flex" }}>0 Official Reviews</span>
            <span style={{ display: "flex" }}>·</span>
            <span style={{ display: "flex" }}>Time to decision: {seconds} second{seconds === 1 ? "" : "s"}</span>
          </div>
        ) : (
          reviews.map((r) => (
            <div
              key={r.reviewer}
              style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 19, background: "#fff", border: `1.5px solid ${FORUM.line}`, borderRadius: 6, padding: "4px 14px" }}
            >
              <Badge>Official Review</Badge>
              <span style={{ display: "flex", fontWeight: 700, color: FORUM.title }}>{r.reviewer}</span>
              <span style={{ display: "flex", color: FORUM.text }}>
                <span style={{ display: "flex", fontWeight: 700, color: FORUM.label, marginRight: 6 }}>Rating:</span>
                <span style={{ display: "flex", fontWeight: 800, color: scoreColor(r.score) }}>{r.score}</span>
              </span>
              <span style={{ display: "flex", color: FORUM.text }}>
                <span style={{ display: "flex", fontWeight: 700, color: FORUM.label, marginRight: 6 }}>Confidence:</span>
                <span style={{ display: "flex" }}>{r.confidence}</span>
              </span>
              <span style={{ display: "flex", color: "#555", fontStyle: "italic" }}>“{r.comment}”</span>
            </div>
          ))
        )}
      </div>
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
        <div style={{ display: "flex", fontSize: 44, fontWeight: 800, color: PALETTE.ink, marginTop: 2 }}>{plainTitle(data.grade)}</div>
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

        <Forum data={data} accent={stampColor} />

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
