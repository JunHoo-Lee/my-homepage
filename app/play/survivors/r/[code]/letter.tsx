/* The decision letter as an Open Graph image (rendered by next/og, so: flexbox only, no emoji). */

import { ImageResponse } from "next/og";

import { DECISIONS, reviewsFor } from "../../lore";
import { PALETTE } from "../../contracts";
import { SHARE_PAPERS, decodeShare, headline, plainTitle, type ShareData } from "../../share";

export const OG_SIZE = { width: 1200, height: 630 };

const STAMP_COLOR = { Oral: PALETTE.purple, Accept: PALETTE.green, Borderline: PALETTE.gold, Reject: PALETTE.red, DeskReject: PALETTE.red } as const;
const scoreColor = (score: number) => (score <= 3 ? PALETTE.red : score <= 5 ? PALETTE.orange : score === 6 ? PALETTE.gold : PALETTE.green);
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// A desk reject has no reviews, only the area chair's note: laid out like a forum
// post on a review site, and written with the least effort an AC can spend.
const LAZY_METAREVIEWS = [
  "I agree with the reviewers.",
  "Formatting. I did not read further.",
  "Not a good fit for this venue. Good luck elsewhere.",
  "The reasons for rejection are self-evident.",
  "Margins.",
  "Please see the call for papers.",
  "Rejected. No further comments.",
  "Out of scope, I think. I only read the title.",
];
const AC_ID_CHARS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function MetaReviewNote({ data }: { data: ShareData }) {
  const n = data.submission;
  const acId = [0, 1, 2, 3].map((i) => AC_ID_CHARS[(n * (i * 7 + 3) + i * 11) % AC_ID_CHARS.length]).join("");
  const seconds = Math.floor(data.time);
  const fields: [string, string][] = [
    ["Metareview", LAZY_METAREVIEWS[n % LAZY_METAREVIEWS.length]],
    ["Confidence", "5: The area chair is absolutely certain"],
    ["Reviews received", "0"],
    ["Time spent on this submission", `${seconds} second${seconds === 1 ? "" : "s"}`],
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", background: "#fff", border: "1.5px solid #d9d4c7", borderLeft: `7px solid ${PALETTE.red}`, borderRadius: 6, padding: "12px 20px 14px" }}>
      <div style={{ display: "flex", fontSize: 25, fontWeight: 700, color: "#3e6775" }}>Meta Review of Submission{n} by Area Chair {acId}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 16, color: "#8a8a8a", marginTop: 3 }}>
        <span style={{ display: "flex", background: "#8c1b13", color: "#fff", borderRadius: 3, padding: "1px 8px", fontWeight: 700 }}>Meta Review</span>
        <span style={{ display: "flex" }}>Area Chair {acId} · 23:59 AoE · Readers: Everyone</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 9 }}>
        {fields.map(([label, value]) => (
          <div key={label} style={{ display: "flex", fontSize: 21, color: "#2b2b2b" }}>
            <span style={{ display: "flex", fontWeight: 700, color: "#8c1b13", marginRight: 8 }}>{label}:</span>
            <span style={{ display: "flex" }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Letter({ data }: { data: ShareData }) {
  const stampColor = STAMP_COLOR[data.grade];
  const reviews =
    data.grade === "DeskReject"
      ? []
      : reviewsFor({ time: data.time, level: data.level, kills: data.kills, maxCombo: data.maxCombo, bossDefeated: data.bossDefeated, runLength: 300 });
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
          padding: "28px 44px",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", height: 10, position: "absolute", left: 0, right: 0, top: 0, background: `repeating-linear-gradient(135deg, ${PALETTE.red} 0 22px, ${PALETTE.paper} 22px 34px, ${PALETTE.blue} 34px 56px, ${PALETTE.paper} 56px 68px)`, borderRadius: "20px 20px 0 0" }} />
        <div style={{ display: "flex", color: PALETTE.blue, fontSize: 22, fontWeight: 700, letterSpacing: 3, marginTop: 6 }}>
          DECISION · SUBMISSION #{data.submission}
        </div>
        <div style={{ display: "flex", fontSize: data.grade === "DeskReject" ? 54 : 64, fontWeight: 800, color: PALETTE.ink, marginTop: 6 }}>{plainTitle(data.grade)}</div>
        {data.grade === "DeskReject" ? null : <div style={{ display: "flex", fontSize: 26, color: "#555", marginTop: 4 }}>{headline(data)}</div>}
        <div
          style={{
            display: "flex",
            position: "absolute",
            right: 48,
            top: 40,
            border: `7px solid ${stampColor}`,
            borderRadius: 14,
            color: stampColor,
            fontSize: 50,
            fontWeight: 900,
            letterSpacing: 4,
            padding: "6px 22px",
            transform: "rotate(-12deg)",
            opacity: 0.85,
          }}
        >
          {DECISIONS[data.grade].stamp}
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: data.grade === "DeskReject" ? 14 : 22, gap: 10 }}>
          {reviews.length ? (
            reviews.map((r) => (
              <div
                key={r.reviewer}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  fontSize: 25,
                  padding: "8px 16px",
                  borderRadius: 12,
                  background: r.reviewer === "Reviewer 2" ? "#fbe9e7" : "#f6f1e7",
                  border: `2px solid ${r.reviewer === "Reviewer 2" ? PALETTE.red : "#e4dccb"}`,
                }}
              >
                <span style={{ fontWeight: 800, color: PALETTE.ink }}>{r.reviewer}</span>
                <span style={{ display: "flex", color: "#fff", background: scoreColor(r.score), borderRadius: 999, padding: "2px 14px", fontWeight: 800 }}>Score {r.score}</span>
                <span style={{ color: r.reviewer === "Reviewer 2" ? PALETTE.red : "#777" }}>Confidence {r.confidence}</span>
                <span style={{ color: "#444", fontStyle: "italic" }}>“{r.comment}”</span>
              </div>
            ))
          ) : (
            <MetaReviewNote data={data} />
          )}
        </div>

        <div style={{ display: "flex", gap: 14, marginTop: "auto" }}>
          {stats.map(([label, value]) => (
            <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", border: `3px solid ${PALETTE.ink}`, borderRadius: 14, padding: "6px 0" }}>
              <span style={{ fontSize: 36, fontWeight: 800, color: PALETTE.ink }}>{value}</span>
              <span style={{ fontSize: 15, letterSpacing: 2, color: "#666" }}>{label}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontSize: 22, color: "#666" }}>
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
