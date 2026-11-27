/* The decision letter as an Open Graph image (rendered by next/og, so: flexbox only, no emoji). */

import { ImageResponse } from "next/og";

import { DECISIONS, reviewsFor } from "../../lore";
import { PALETTE } from "../../contracts";
import { SHARE_PAPERS, decodeShare, headline, plainTitle, type ShareData } from "../../share";

export const OG_SIZE = { width: 1200, height: 630 };

const STAMP_COLOR = { Oral: PALETTE.purple, Accept: PALETTE.green, Borderline: PALETTE.gold, Reject: PALETTE.red, DeskReject: PALETTE.red } as const;
const scoreColor = (score: number) => (score <= 3 ? PALETTE.red : score <= 5 ? PALETTE.orange : score === 6 ? PALETTE.gold : PALETTE.green);
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

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
        <div style={{ display: "flex", fontSize: 64, fontWeight: 800, color: PALETTE.ink, marginTop: 6 }}>{plainTitle(data.grade)}</div>
        <div style={{ display: "flex", fontSize: 26, color: "#555", marginTop: 4 }}>{headline(data)}</div>
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

        <div style={{ display: "flex", flexDirection: "column", marginTop: 22, gap: 10 }}>
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
            <div style={{ display: "flex", fontSize: 26, color: "#555", padding: "8px 16px", background: "#f6f1e7", borderRadius: 12 }}>
              No reviews: desk rejected before any reviewer opened the PDF.
            </div>
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
