"use client";

import type { CSSProperties } from "react";

import { BOSS_TIME, RUN_LENGTH, formatTime, type Hud as HudState } from "../game";
import { BugIcon, CardIcon, PauseIcon, Reviewer2Icon, SoundIcon } from "../icons";
import { HUD_TERMS } from "../lore";
import styles from "./hud.module.css";
import kit from "./kit.module.css";
import { useUiSound } from "./sound";

type Props = {
  hud: HudState;
  /** Counts sanity drops; every change restarts the shake. */
  hurt: number;
  /** Counts combo increases; every change restarts the pop. */
  pops: number;
  muted: boolean;
  touch: boolean;
  /** A level-up or the pause menu is open over the HUD. */
  frozen: boolean;
  onToggleMute: () => void;
  onPause: () => void;
};

const COMBO_MIN = 5;

/** Alternates between two identical keyframe classes, so the animation restarts on every count. */
const retrigger = (count: number, a: string, b: string) => (count <= 0 ? "" : count % 2 ? a : b);

const comboTier = (combo: number) => (combo >= 100 ? styles.tier3 : combo >= 50 ? styles.tier2 : combo >= 25 ? styles.tier1 : "");

const ratio = (value: number, max: number) => (max > 0 ? Math.max(0, Math.min(1, value / max)) : 0);
/** A bar fill as a transform, so HUD ticks never trigger layout. */
const fill = (value: number, max: number) => ({ transform: `scaleX(${ratio(value, max)})` });
/** The same as a clip, for fills whose pattern must not be squashed. */
const clip = (value: number, max: number) => ({ clipPath: `inset(0 ${(1 - ratio(value, max)) * 100}% 0 0)` });

export default function Hud({ hud, hurt, pops, muted, touch, frozen, onToggleMute, onPause }: Props) {
  const ui = useUiSound();
  const remaining = Math.max(0, RUN_LENGTH - hud.time);
  const low = hud.hp < hud.maxHp * 0.3;
  const sanity = fill(hud.hp, hud.maxHp);
  const status = hud.boss ? HUD_TERMS.bossActive : hud.time < BOSS_TIME ? HUD_TERMS.bossIn(formatTime(BOSS_TIME - hud.time)) : HUD_TERMS.afterBoss;
  // the last ten seconds tick: the pulse restarts every second
  const lastSeconds = remaining <= 10 && remaining > 0 ? retrigger(Math.ceil(remaining), styles.tickA, styles.tickB) : "";
  const kills = hud.kills.toLocaleString("en-US");
  const muteLabel = muted ? "Unmute" : "Mute";

  return (
    <div className={`${styles.hud} ${frozen ? styles.frozen : ""}`}>
      <div className={styles.xp} role="meter" aria-label={`${HUD_TERMS.level} ${hud.level}, ${HUD_TERMS.xp}`} aria-valuemin={0} aria-valuemax={hud.xpNext} aria-valuenow={Math.min(hud.xp, hud.xpNext)}>
        <div className={`${styles.xpFill} ${retrigger(hud.level - 1, styles.levelA, styles.levelB)}`} style={fill(hud.xp, hud.xpNext)} />
        <span className={styles.xpLabel}>
          <b>
            {HUD_TERMS.level} {hud.level}
          </b>
          <span className={styles.wide}>
            {hud.xp}/{hud.xpNext} {HUD_TERMS.xp}
          </span>
        </span>
      </div>

      <div className={styles.row}>
        <div className={`${styles.sanity} ${low ? styles.low : ""} ${retrigger(hurt, styles.shakeA, styles.shakeB)}`}>
          <div className={styles.sanityHead}>
            <span className={styles.sanityLabel}>{HUD_TERMS.hp}</span>
            {hud.revives > 0 ? (
              <span className={styles.revives} title="ACRO rollbacks left">
                <CardIcon id="acro" />
                {hud.revives}
              </span>
            ) : null}
          </div>
          <div className={styles.bar} role="meter" aria-label={HUD_TERMS.hp} aria-valuemin={0} aria-valuemax={hud.maxHp} aria-valuenow={hud.hp}>
            <div className={styles.trail} style={sanity} />
            <div className={styles.fill} style={sanity} />
            <span className={styles.barText}>
              {hud.hp}/{hud.maxHp}
            </span>
          </div>
        </div>

        <div className={`${styles.clock} ${remaining <= 60 ? styles.urgent : ""} ${lastSeconds}`} role="timer" aria-label={`${formatTime(remaining)} until the ${HUD_TERMS.timer} deadline`}>
          <strong>{formatTime(remaining)}</strong>
          <span>{HUD_TERMS.timer}</span>
        </div>

        <div className={styles.right}>
          <span className={styles.kills} title={HUD_TERMS.kills}>
            <BugIcon />
            <b>{kills}</b>
            <span className={styles.wide} aria-hidden="true">
              {HUD_TERMS.killsLabel(hud.kills)}
            </span>
            <span className={kit.srOnly}>{HUD_TERMS.killsLabel(hud.kills)}</span>
          </span>
          <button type="button" className={kit.iconButton} aria-label={muteLabel} title={touch ? undefined : `${muteLabel} (M)`} onClick={onToggleMute} {...ui.hover}>
            <SoundIcon muted={muted} />
          </button>
          <button type="button" className={kit.iconButton} aria-label="Pause" title={touch ? undefined : "Pause (Esc)"} onClick={onPause} {...ui.hover}>
            <PauseIcon />
          </button>
        </div>
      </div>

      <p className={`${styles.status} ${hud.boss ? styles.statusBoss : ""}`}>{status}</p>

      {hud.boss ? (
        <div
          className={`${styles.boss} ${hud.boss.enraged ? styles.enraged : ""}`}
          role="meter"
          aria-label="Reviewer 2"
          aria-valuemin={0}
          aria-valuemax={hud.boss.maxHp}
          aria-valuenow={Math.ceil(hud.boss.hp)}
        >
          <div className={styles.trail} style={fill(hud.boss.hp, hud.boss.maxHp)} />
          <div className={styles.bossFill} style={clip(hud.boss.hp, hud.boss.maxHp)} />
          <span className={styles.bossLabel}>
            <Reviewer2Icon />
            {HUD_TERMS.bossBar}
          </span>
        </div>
      ) : null}

      {hud.combo >= COMBO_MIN ? (
        <div className={styles.comboRow}>
          <span className={`${styles.combo} ${comboTier(hud.combo)} ${retrigger(pops, styles.popA, styles.popB)}`}>
            <b>{hud.combo}×</b> combo
            <span className={styles.drain} style={{ "--left": hud.comboTime ?? 0 } as CSSProperties} />
          </span>
        </div>
      ) : null}
    </div>
  );
}
