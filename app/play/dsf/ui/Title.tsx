"use client";

/*
 * The title: the sleeping island behind, one flat cover for the words, and
 * one paper box with the only thing there is to do.
 */

import Link from "next/link";

import { FEYNMAN, TITLE } from "../content";
import kit from "./kit.module.css";

type Props = { muted: boolean; onStart(): void; onMute(): void };

export default function Title({ muted, onStart, onMute }: Props) {
  const [first, ...rest] = TITLE.name.split(" ");
  return (
    <div className={kit.title}>
      <div className={kit.titleCover} aria-hidden="true" />
      <div className={kit.titleHead}>
        <p className={kit.titleKicker}>{TITLE.kicker}</p>
        <h1 className={kit.titleName} aria-label={TITLE.name}>
          <span>{first} I</span> <span>{rest.slice(1).join(" ")}</span>
        </h1>
        <p className={kit.titleQuote}>“{FEYNMAN.quote}”</p>
        <p className={kit.titleCredit}>{FEYNMAN.credit}</p>
      </div>
      <div className={`${kit.paper} ${kit.titleBox}`}>
        <p>{TITLE.box}</p>
        <button type="button" className={`${kit.btn} ${kit.big}`} onClick={onStart}>
          {TITLE.start}
        </button>
        <p className={kit.titleMeta}>{TITLE.meta}</p>
        <div className={kit.titleLinks}>
          <Link href="/dsf" className={kit.link}>
            Project page
          </Link>
          <Link href="/play" className={kit.link}>
            Games
          </Link>
          <button type="button" className={kit.link} onClick={onMute} aria-pressed={muted} aria-label="Mute">
            Sound: {muted ? "off" : "on"}
          </button>
        </div>
      </div>
    </div>
  );
}
