/*
 * Hand-drawn SVG icons for the upgrade cards and the HUD controls.
 *
 * One family: a 24x24 grid, a 2-unit round stroke in currentColor and no fill
 * (solid fill only for small accents), so every icon reads the same in white
 * on the blue card tile and in ink on paper. Long straight strokes sit on
 * whole units so they stay crisp at 24 and 48 px. Icons are decorative: the
 * button or card around them carries the accessible name.
 */
import type { ReactNode } from "react";

import type { CardIconId } from "./contracts";

export type IconProps = {
  className?: string;
  /** Width and height; the default 1em scales the icon with the font size. */
  size?: number | string;
};

function Icon({ className, size = "1em", children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

const CARD_ICONS: Record<CardIconId, ReactNode> = {
  // ∇, and a ball rolling down the loss curve
  gradient: (
    <>
      <path d="M12.5 4H21l-4.25 7.4Z" />
      <circle cx="4" cy="4.5" r="1.5" fill="currentColor" />
      <path d="M4 8.5C4 14 8 18 15.5 18.5M12.5 20.85l3-2.35-2.65-2.72" />
    </>
  ),
  // two support vectors orbiting you on a dashed margin
  // (8 even dashes; the offset hides one under each support vector)
  dsv: (
    <>
      <circle cx="12" cy="12" r="8" pathLength={40} strokeDasharray="2.2 2.8" strokeDashoffset={-3.9} />
      <circle cx="12" cy="12" r="2.5" />
      <circle cx="17.66" cy="6.34" r="2" fill="currentColor" />
      <circle cx="6.34" cy="17.66" r="2" fill="currentColor" />
    </>
  ),
  // a tiny 2-3-1 net with its middle unit dropped (thin edges keep the net legible)
  dropout: (
    <>
      <path strokeWidth={1.25} d="M4 7.5 12 4.5M4 7.5l8 12M4 16.5l8-12M4 16.5l8 3M12 4.5l8 7.5M12 19.5l8-7.5" />
      <circle cx="4" cy="7.5" r="1.5" fill="currentColor" />
      <circle cx="4" cy="16.5" r="1.5" fill="currentColor" />
      <circle cx="12" cy="4.5" r="1.5" fill="currentColor" />
      <circle cx="12" cy="19.5" r="1.5" fill="currentColor" />
      <circle cx="20" cy="12" r="1.5" fill="currentColor" />
      <path d="m10.25 10.25 3.5 3.5m0-3.5-3.5 3.5" />
    </>
  ),
  // an eye locked on inside a focus frame
  attention: (
    <>
      <path d="M3 7.5V5a2 2 0 0 1 2-2h2.5M16.5 3H19a2 2 0 0 1 2 2v2.5M21 16.5V19a2 2 0 0 1-2 2h-2.5M7.5 21H5a2 2 0 0 1-2-2v-2.5" />
      <path d="M6 12c1.8-3.3 4-4.5 6-4.5s4.2 1.2 6 4.5c-1.8 3.3-4 4.5-6 4.5S7.8 15.3 6 12Z" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </>
  ),
  // a shockwave ring flattening everything around you
  shot: (
    <>
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="5" />
      <path d="M19.95 7.77a9 9 0 0 1 0 8.46M16.23 19.95a9 9 0 0 1-8.46 0M4.05 16.23a9 9 0 0 1 0-8.46M7.77 4.05a9 9 0 0 1 8.46 0" />
    </>
  ),
  // output fed back as input: a loop around you
  looped: (
    <>
      <path d="M19.73 14.07A8 8 0 1 1 17.66 6.34" />
      <path d="M13.66 6.34h4v-4" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </>
  ),
  // an anchor token inside a [ ] template slot
  anchors: (
    <>
      <path d="M5.5 4H3v16h2.5M18.5 4H21v16h-2.5" />
      <circle cx="12" cy="6.5" r="2" />
      <path d="M12 8.5v11M9.5 11h5M7.5 15a4.5 4.5 0 0 0 9 0" />
    </>
  ),
  // momentum: speed streaks behind two chevrons
  adam: (
    <>
      <path d="m8.5 5 7 7-7 7m6-14 7 7-7 7" />
      <path d="M2.5 9h3m-3 6h3M2 12h5" />
    </>
  ),
  // weight decay: a heart that lifts weights
  decay: (
    <>
      <path d="M12 5.35a3.31 3.31 0 0 0-6.48.96c0 2.81 3.6 5.69 6.48 8.21 2.88-2.52 6.48-5.4 6.48-8.21A3.31 3.31 0 0 0 12 5.35Z" />
      <path d="M8 18h8M2.5 18H4m16 0h1.5" />
      <rect x="5" y="15" width="3" height="6" rx="1" />
      <rect x="16" y="15" width="3" height="6" rx="1" />
    </>
  ),
  // a magnet between wide context brackets
  context: (
    <>
      <path d="M4.5 6.5 2 12l2.5 5.5M19.5 6.5 22 12l-2.5 5.5" />
      <path d="M7 6v7a5 5 0 0 0 10 0V6h-3v7a2 2 0 0 1-4 0V6Z" />
      <path d="M7 6h3v3H7Zm7 0h3v3h-3Z" fill="currentColor" />
    </>
  ),
  // fp16: a lightning bolt with a tiny 16
  mixed: (
    <>
      <path d="M11 2.5 3.5 13h5l-2 8.5L14 10H9.5Z" />
      <path d="m13.75 14.25 1.25-1.25v8" />
      <circle cx="20" cy="19" r="2" />
      <path d="M21.75 13.1c-2.2.1-3.75 2-3.75 5.9" />
    </>
  ),
  // N-way, K-shot, any-way: a grid of ways, one of them magic
  anyway: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <path d="M17.5 13c0 2.7 1.8 4.5 4.5 4.5-2.7 0-4.5 1.8-4.5 4.5 0-2.7-1.8-4.5-4.5-4.5 2.7 0 4.5-1.8 4.5-4.5Z" fill="currentColor" />
    </>
  ),
  // ACRO rollback: a rewind arrow around a robot arm
  acro: (
    <>
      <path d="M4.21 16.5A9 9 0 1 0 4.21 7.5" />
      <path d="M3.17 3.64 4.21 7.5l3.86-1.04" />
      <path d="M8.5 17h6M11.5 17 9 11.5 14 9l.5-2M14 9l2 .6" />
      <circle cx="9" cy="11.5" r="1.5" fill="currentColor" />
    </>
  ),
  // restore checkpoint: a floppy disk with a plus
  checkpoint: (
    <>
      <path d="M5 3h10.8L21 8.2V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M8 3v4h6V3" />
      <path d="M12 11.5v7M8.5 15h7" />
    </>
  ),
};

export function isCardIconId(id: string): id is CardIconId {
  return Object.prototype.hasOwnProperty.call(CARD_ICONS, id);
}

export function CardIcon({ id, ...props }: IconProps & { id: CardIconId }) {
  return <Icon {...props}>{CARD_ICONS[id]}</Icon>;
}

export function SoundIcon({ muted, ...props }: IconProps & { muted: boolean }) {
  return (
    <Icon {...props}>
      <path d="M11 5 6.5 9H4a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h2.5l4.5 4Z" />
      {muted ? (
        <path d="m15.5 9.5 5 5m0-5-5 5" />
      ) : (
        <path d="M14.34 8.99a4.5 4.5 0 0 1 0 6.02M17.01 5.99a8.5 8.5 0 0 1 0 12.02" />
      )}
    </Icon>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="6" y="4" width="4" height="16" rx="1.5" />
      <rect x="14" y="4" width="4" height="16" rx="1.5" />
    </Icon>
  );
}

/** Resume. */
export function PlayIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 4.5v15l12-7.5Z" />
    </Icon>
  );
}

/** Restart / resubmit. */
export function RestartIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.27 14.07A8 8 0 1 0 6.34 6.34" />
      <path d="M6.34 2.34v4h4" />
    </Icon>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="18" cy="5.5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="18.5" r="2.5" />
      <path d="m8.2 10.8 7.6-4.1m-7.6 6.5 7.6 4.1" />
    </Icon>
  );
}

/** A paper, for the cards and links that point at a publication. */
export function PaperIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5M9 13h6m-6 4h4" />
    </Icon>
  );
}

/** A bug, for the "concerns addressed" counter. */
export function BugIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 12.5a4 4 0 0 1 8 0V16a4 4 0 0 1-8 0Z" />
      <path d="M9.5 9.2a2.5 2.5 0 0 1 5 0M10 7 8.5 4.5M14 7l1.5-2.5M12 12v8M8 13H4.5m11.5 0h3.5M8 17l-3 2m11-2 3 2M8.6 10.2 5.5 8.5m9.9 1.7 3.1-1.7" />
    </Icon>
  );
}

/** An hourglass, for the AoE deadline. */
export function DeadlineIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 3h12M6 21h12M7.5 3v2.6c0 1.6.8 3 2.1 3.9L12 11l2.4-1.5a4.7 4.7 0 0 0 2.1-3.9V3M7.5 21v-2.6c0-1.6.8-3 2.1-3.9L12 13l2.4 1.5a4.7 4.7 0 0 1 2.1 3.9V21" />
      <path d="M9.5 19.5h5L12 17.5Z" fill="currentColor" />
    </Icon>
  );
}

/** Reviewer 2: round glasses, furrowed brows, a frown (Score: 3, Confidence: 5). */
export function Reviewer2Icon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9.5" />
      <circle cx="8.5" cy="12" r="2.25" />
      <circle cx="15.5" cy="12" r="2.25" />
      <path d="M10.75 12h2.5M6 7.5 9.5 9M18 7.5 14.5 9M9.5 17.5c1.6-1.3 3.4-1.3 5 0" />
    </Icon>
  );
}

/** The rubber stamp that lands on the decision letter. */
export function StampIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 12v-1.8c0-1.3-1.5-2-1.5-3.7a3.5 3.5 0 0 1 7 0c0 1.7-1.5 2.4-1.5 3.7V12" />
      <rect x="4" y="12" width="16" height="5" rx="1.5" />
      <path d="M5 21h14" />
    </Icon>
  );
}
