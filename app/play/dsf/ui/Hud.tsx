"use client";

/*
 * What stays on screen while walking: the question as it currently stands,
 * the Notebook with the count of insights, and the sound toggle. Below it,
 * where the message window will appear: the action chip and one-line notices.
 */

import { LOG, DOOR_NEEDS } from "../content";
import type { Near } from "../world";
import kit from "./kit.module.css";

type HudProps = {
  question: string;
  flash: number;
  insights: number;
  muted: boolean;
  inert: boolean;
  onBook(): void;
  onMute(): void;
};

export function Hud({ question, flash, insights, muted, inert, onBook, onMute }: HudProps) {
  return (
    <div className={kit.hud} inert={inert}>
      <button type="button" key={flash} className={`${kit.hudWin} ${kit.hudQ} ${flash > 0 ? kit.hudFlash : ""}`} onClick={onBook} aria-label={`The question: ${question}`}>
        <span>{question}</span>
      </button>
      <button type="button" className={`${kit.hudWin} ${kit.hudBtn}`} onClick={onBook} aria-label={LOG.button}>
        <i className={`${kit.icon} ${kit.iconBook}`} aria-hidden="true" />
        <span aria-hidden="true">
          {Math.min(insights, DOOR_NEEDS)}/{DOOR_NEEDS}
        </span>
      </button>
      <button type="button" className={`${kit.hudWin} ${kit.hudBtn} ${kit.hudMute}`} onClick={onMute} aria-label="Mute" aria-pressed={muted}>
        <i className={`${kit.icon} ${muted ? kit.iconMuted : kit.iconSound}`} aria-hidden="true" />
      </button>
    </div>
  );
}

type ChipProps = { near: NonNullable<Near>; keyHint: boolean; onAct(): void };

/** One gold button for the thing the player is standing next to. */
export function ActionChip({ near, keyHint, onAct }: ChipProps) {
  const verb = near.kind === "statue" ? "Talk" : "Examine";
  return (
    <div className={kit.chip}>
      <div className={kit.chipName} aria-hidden="true">
        {near.name}
      </div>
      <button type="button" className={`${kit.btn} ${kit.chipGo}`} onClick={onAct} aria-label={`${verb}: ${near.name}`}>
        {verb}
        {keyHint ? <span className={kit.kbd}>Space</span> : null}
      </button>
    </div>
  );
}

export function Notice({ text }: { text: string }) {
  return (
    <div className={kit.notice} role="status">
      {text}
    </div>
  );
}
