"use client";

/*
 * The last minute: the closing cards in one window beside the island at
 * dawn (a sheet at the foot on a phone, a column on a desktop), and the
 * Finale, a paper sheet with what the paper says follows from all this.
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { shareLink } from "../../shared/share";
import { CREDITS, FEYNMAN, FINALE } from "../content";
import { END } from "../script";
import kit from "./kit.module.css";

/**
 * Feynman's sentence, then its contrapositive in two clauses, then Reviewer 2's stamp.
 * Every line has its place from the start and only becomes visible, so nothing moves when the next one arrives.
 */
export function EndCards({ phase, onFinale }: { phase: number; onFinale(): void }) {
  if (phase < END.quote) return null;
  const [first, second] = FEYNMAN.contrapositive.split(", ");
  const dim = phase >= END.first ? kit.endDim : "";
  return (
    <div className={kit.end}>
      <div className={`${kit.slateWin} ${kit.endWin}`}>
        <p className={`${kit.endQuote} ${dim}`}>“{FEYNMAN.quote}”</p>
        <p className={`${kit.endCredit} ${dim}`}>{FEYNMAN.credit}</p>
        <p key={`a${phase >= END.first}`} className={`${kit.endLine} ${phase >= END.first ? "" : kit.hid}`}>
          {first},
        </p>
        <p key={`b${phase >= END.second}`} className={`${kit.endLine} ${kit.endGold} ${phase >= END.second ? "" : kit.hid}`}>
          {second}
        </p>
        <p key={`c${phase >= END.stamp}`} className={`${kit.stamp} ${phase >= END.stamp ? "" : kit.hid}`}>
          {FINALE.stamp}
        </p>
        {phase >= END.button ? (
          <button type="button" className={`${kit.btn} ${kit.endGo}`} onClick={onFinale} autoFocus>
            {FINALE.closingTitle}
          </button>
        ) : (
          <span className={`${kit.btn} ${kit.endGo} ${kit.hid}`} aria-hidden="true">
            {FINALE.closingTitle}
          </span>
        )}
      </div>
    </div>
  );
}

export function Finale({ onBack }: { onBack(): void }) {
  const [shared, setShared] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);
  // focus moves into the sheet, which is read from its top
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div className={`${kit.veil} ${kit.veilBook}`}>
      <div ref={ref} className={`${kit.paper} ${kit.book}`} role="dialog" aria-modal="true" aria-label={FINALE.closingTitle} tabIndex={-1}>
        <p className={kit.kick}>{FINALE.kicker}</p>
        <p className={kit.carvedLine}>“{FEYNMAN.contrapositive}”</p>
        <h2>{FINALE.closingTitle}</h2>
        <p className={kit.lead}>{FINALE.lead}</p>
        {FINALE.thoughts.map((thought) => (
          <p key={thought.lead}>
            <b>{thought.lead}</b> {thought.body}
          </p>
        ))}
        <h2>{FINALE.limitsTitle}</h2>
        <p>{FINALE.limits}</p>
        <p>{FINALE.ending}</p>
        <div className={kit.row}>
          <button type="button" className={kit.btn} onClick={onBack}>
            {FINALE.links.back}
          </button>
          <Link href="/dsf" className={kit.ghostPaper}>
            {FINALE.links.project}
          </Link>
          <a href="/dsf/assets/dsf-paper.pdf" className={kit.ghostPaper}>
            {FINALE.links.paper}
          </a>
        </div>
        <div className={kit.bookLinks}>
          <Link href="/play/backdoor" className={kit.link}>
            {FINALE.links.other}
          </Link>
          <button
            type="button"
            className={kit.link}
            onClick={() => {
              void shareLink("What I Cannot Create", "An island mystery about the Discriminative Score Function (NeurIPS 2026)", "/play/dsf").then((result) => setShared(result === "copied" ? "Link copied" : result === "failed" ? "Copy failed" : ""));
            }}
          >
            {shared || FINALE.links.share}
          </button>
          <Link href="/play" className={kit.link}>
            {FINALE.links.games}
          </Link>
        </div>
        <p className={kit.credits}>{CREDITS}</p>
      </div>
    </div>
  );
}
