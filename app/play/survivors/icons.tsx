/*
 * STUB — replaced by hand-drawn SVG icons.
 * Contract: CardIcon renders the icon for a CardIconId (see ./contracts.ts),
 * 24x24 viewBox, currentColor; SoundIcon/PauseIcon for UI controls.
 */
import type { CardIconId } from "./contracts";

const GLYPH: Record<CardIconId, string> = {
  gradient: "∇", dsv: "◉", dropout: "◌", attention: "⟶", shot: "◎", looped: "↻", anchors: "⚓",
  adam: "»", decay: "♥", context: "⌖", mixed: "⚡", anyway: "✦", acro: "⟲", checkpoint: "✚",
};

export function isCardIconId(id: string): id is CardIconId {
  return id in GLYPH;
}

export function CardIcon({ id, className }: { id: CardIconId; className?: string }) {
  return (
    <span className={className} aria-hidden="true">
      {GLYPH[id]}
    </span>
  );
}

export function SoundIcon({ muted, className }: { muted: boolean; className?: string }) {
  return (
    <span className={className} aria-hidden="true">
      {muted ? "🔇" : "🔊"}
    </span>
  );
}

export function PauseIcon({ className }: { className?: string }) {
  return (
    <span className={className} aria-hidden="true">
      ❚❚
    </span>
  );
}
