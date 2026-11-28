/* The decision letter as an Open Graph image (rendered by next/og, so: flexbox only, no emoji). */

import { ImageResponse } from "next/og";

import { DECISIONS } from "../../lore";
import { PALETTE } from "../../contracts";
import { SHARE_PAPERS, decodeShare, forumThread, plainTitle, type ShareData } from "../../share";

export const OG_SIZE = { width: 1200, height: 630 };

const STAMP_COLOR = { Oral: PALETTE.purple, Accept: PALETTE.green, Borderline: PALETTE.gold, Reject: PALETTE.red, DeskReject: PALETTE.red } as const;
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

const FORUM = { label: "#8c1b13", ink: "#1f2328", meta: "#6b6b6b", rule: "#dcdcdc" };

/** "Label: value" the way a forum note prints its fields. */
function Field({ label, value, size = 19 }: { label: string; value: string; size?: number }) {
  return (
    <span style={{ display: "flex", fontSize: size, color: FORUM.ink }}>
      <span style={{ display: "flex", fontWeight: 700, color: FORUM.label, marginRight: 7 }}>{label}:</span>
      <span style={{ display: "flex" }}>{value}</span>
    </span>
  );
}

// Flat on purpose: a plain white page with hairlines and an indented reply
// thread, like a screenshot of the forum pasted into the letter.
function Forum({ data }: { data: ShareData }) {
  const thread = forumThread(data);
  return (
    <div style={{ display: "flex", flexDirection: "column", marginTop: 6, background: "#fff", border: `1px solid ${FORUM.rule}`, padding: "8px 18px 9px" }}>
      <div style={{ display: "flex", fontSize: 22, fontWeight: 700, color: FORUM.ink }}>{thread.title}</div>
      <div style={{ display: "flex", fontSize: 15, color: FORUM.meta, marginTop: 1 }}>{thread.signature}</div>
      <div style={{ display: "flex", marginTop: 5 }}>
        <Field label={thread.field} value={thread.text} size={20} />
      </div>
      {thread.reviews.length ? (
        thread.reviews.map((r) => (
          <div key={r.title} style={{ display: "flex", flexDirection: "column", marginTop: 6, paddingTop: 5, borderTop: `1px solid ${FORUM.rule}` }}>
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 14, paddingLeft: 12, borderLeft: `3px solid ${FORUM.rule}` }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ display: "flex", fontSize: 18, fontWeight: 700, color: FORUM.ink }}>{r.title}</span>
                <span style={{ display: "flex", fontSize: 14, color: FORUM.meta }}>{r.signature}</span>
              </div>
              <div style={{ display: "flex", gap: 18 }}>
                <Field label="Rating" value={r.rating} size={17} />
                <Field label="Confidence" value={String(r.confidence)} size={17} />
                <Field label="Comment" value={r.comment} size={17} />
              </div>
            </div>
          </div>
        ))
      ) : (
        <div style={{ display: "flex", fontSize: 16, color: FORUM.meta, marginTop: 8, paddingTop: 7, borderTop: `1px solid ${FORUM.rule}` }}>{thread.empty}</div>
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
