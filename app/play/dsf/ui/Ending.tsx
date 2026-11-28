"use client";

/*
 * The last minute: the closing cards over the island at dawn, and the
 * Finale, a paper sheet with what the paper says follows from all this.
 */

import Link from "next/link";
import { useState } from "react";

import { shareLink } from "../../shared/share";
import { CREDITS, FEYNMAN, FINALE } from "../content";
import { END } from "../script";
import kit from "./kit.module.css";

/** Feynman's sentence, then its contrapositive in two clauses, then Reviewer 2's stamp. */
export function EndCards({ phase, onFinale }: { phase: number; onFinale(): void }) {
  if (phase < END.quote) return null;
  const [first, second] = FEYNMAN.contrapositive.split(", ");
  return (
    <div className={kit.end}>
      <p className={`${kit.endQuote} ${phase >= END.first ? kit.endDim : ""}`}>“{FEYNMAN.quote}”</p>
      <p className={`${kit.endCredit} ${phase >= END.first ? kit.endDim : ""}`}>{FEYNMAN.credit}</p>
      {phase >= END.first ? <p className={kit.endLine}>{first},</p> : null}
      {phase >= END.second ? <p className={`${kit.endLine} ${kit.endGold}`}>{second}</p> : null}
      {phase >= END.stamp ? <p className={kit.stamp}>{FINALE.stamp}</p> : null}
      {phase >= END.button ? (
        <button type="button" className={`${kit.btn} ${kit.endGo}`} onClick={onFinale} autoFocus>
          {FINALE.closingTitle}
        </button>
      ) : null}
    </div>
  );
}

export function Finale({ onBack }: { onBack(): void }) {
  const [shared, setShared] = useState("");
  return (
    <div className={`${kit.veil} ${kit.veilBook}`}>
      <div className={`${kit.paper} ${kit.book}`} role="dialog" aria-modal="true" aria-label={FINALE.closingTitle}>
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
          <button type="button" className={kit.btn} onClick={onBack} autoFocus>
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
