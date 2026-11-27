"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import type { AudioSettings } from "../contracts";
import { PlayIcon, RestartIcon, SoundIcon } from "../icons";
import { SCREENS } from "../lore";
import kit from "./kit.module.css";
import styles from "./pause.module.css";
import { useUiSound } from "./sound";

type Props = {
  submission: number | null;
  settings: AudioSettings;
  touch: boolean;
  onSettings: (patch: Partial<AudioSettings>) => void;
  onResume: () => void;
  onRestart: () => void;
};

function Volume({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const percent = Math.round(value * 100);
  return (
    <label className={styles.volume}>
      <span>{label}</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ "--v": `${percent}%` } as CSSProperties}
        aria-valuetext={`${percent}%`}
      />
      <output>{percent}%</output>
    </label>
  );
}

export default function PauseMenu({ submission, settings, touch, onSettings, onResume, onRestart }: Props) {
  const ui = useUiSound();

  return (
    <div className={`${kit.overlay} ${styles.backdrop}`}>
      <section className={`${kit.paper} ${styles.card}`} role="dialog" aria-modal="true" aria-labelledby="gs-paused">
        <p className={kit.eyebrow}>Submission #{submission ?? "—"} · Status: under review</p>
        <h2 id="gs-paused" className={styles.title}>
          {SCREENS.paused}
        </h2>

        <div className={styles.mixer}>
          <Volume label="Music" value={settings.music} onChange={(music) => onSettings({ music, muted: false })} />
          <Volume label="Effects" value={settings.sfx} onChange={(sfx) => onSettings({ sfx, muted: false })} />
          <button
            type="button"
            role="switch"
            aria-checked={!settings.muted}
            aria-keyshortcuts="M"
            className={`${kit.button} ${styles.mute}`}
            onClick={() => onSettings({ muted: !settings.muted })}
            {...ui.hover}
          >
            <SoundIcon muted={settings.muted} />
            Sound
            <span className={styles.state} aria-hidden="true">
              {settings.muted ? "off" : "on"}
            </span>
            {touch ? null : (
              <span className={kit.key} aria-hidden="true">
                M
              </span>
            )}
          </button>
        </div>

        <div className={styles.actions}>
          <button type="button" className={`${kit.button} ${kit.primary}`} onClick={onResume} aria-keyshortcuts="Escape" autoFocus {...ui.hover}>
            <PlayIcon />
            Resume
            {touch ? null : (
              <span className={kit.key} aria-hidden="true">
                Esc
              </span>
            )}
          </button>
          <button type="button" className={kit.button} onClick={onRestart} {...ui.hover}>
            <RestartIcon />
            {SCREENS.withdraw}
          </button>
          <Link className={`${kit.button} ${kit.danger}`} href="/play" onClick={() => ui.play("click")} {...ui.hover}>
            Quit
          </Link>
        </div>
      </section>
    </div>
  );
}
