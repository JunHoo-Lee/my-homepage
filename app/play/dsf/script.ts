/*
 * Every conversation of "What I Cannot Create", as data.
 *
 * A sequence is a list of steps. The shell (ui/shell.ts) plays them:
 *
 *   say     one page in the message window (90 characters or fewer)
 *   cue     something the world animates (world.ts)
 *   choice  a list of rows; the wrong ones get one reply and the list again
 *   hold    a page that stays until one of its buttons is pressed
 *   act     something the shell does: light a lamp in its own books, open a panel ...
 *   wait    a pause, used only in the ending
 *
 * Speakers: N narration, C carved (the sentence on the door), Y you, M Mote,
 * the four suspects by id, R Reviewer 2. `*term*` marks the one emphasised
 * term a page may have. Numbers and claims come from content.ts; insights,
 * verdicts and the fixed sentences are read from there and never retyped.
 */

import { DOOR, DOOR_NEEDS, FEYNMAN, FINALE, QUESTION, SITES, STATUES, TITLE, TOASTS, type SiteId } from "./content";
import type { Cue, StatueId } from "./world";

export type Speaker = "N" | "C" | "Y" | "M" | "R" | StatueId;

export type Act =
  | { kind: "panel"; id: SiteId } // open the puzzle panel
  | { kind: "shown"; id: SiteId } // the world now shows this ruin as solved
  | { kind: "questioned"; id: StatueId } // the suspect is stone
  | { kind: "question"; text: string } // the question in the HUD changes
  | { kind: "compass" }
  | { kind: "notice"; text: string }
  | { kind: "hint" } // how to walk, once
  | { kind: "ending"; phase: number } // the closing cards
  | { kind: "sound"; name: "chime" | "stamp" };

export type HoldButton = { label: string; act: "go" | "note" };

export type Step =
  | { t: "say"; who: Speaker; text: string; sub?: string; auto?: number }
  | { t: "cue"; cue: Cue }
  | { t: "choice"; who: Speaker; text: string; rows: string[]; right: number; wrong: { who: Speaker; text: string } }
  | { t: "hold"; who: Speaker; text: string; plate?: "question"; buttons: HoldButton[]; note?: SiteId }
  | { t: "act"; act: Act }
  | { t: "wait"; ms: number };

export const PAGE_LIMIT = 90;
export const QUESTION_PLATE = "The question now";
export const WALK_ON = "Walk on";
export const READ_NOTE = "Read the note";
export const RULE_OUT = "Rule it out";
export const HOW_ANSWER = "How do you answer?";
export const WRONG_ROW = "That answers someone else.";

export const SPEAKER_NAMES: Record<Speaker, string> = {
  N: "",
  C: "",
  Y: "You",
  M: "Mote",
  R: "Reviewer 2",
  prompter: "The Prompter",
  bookkeeper: "The Bookkeeper",
  copyist: "The Copyist",
  artist: "The Uptown Artist",
};

const say = (who: Speaker, text: string): Step => ({ t: "say", who, text });
const cue = (c: Cue): Step => ({ t: "cue", cue: c });
const act = (a: Act): Step => ({ t: "act", act: a });
const site = (id: SiteId) => SITES.find((item) => item.id === id) ?? SITES[0];
const quoted = (text: string) => `“${text}”`;

/* ------------------------------------------------------------------ opening */

export function opening(): Step[] {
  return [
    { t: "wait", ms: 700 },
    say("N", "You are a classifier. You look at a picture and say which of *1,000 drawers* it belongs in."),
    say("N", "You have never produced a pixel."),
    say("N", "You wake on an island in a sea of static."),
    cue({ type: "wake" }),
    say("Y", "Ostrich. 99.9%."),
    act({ kind: "hint" }),
  ];
}

/* ------------------------------------------------------------------ ruins */

type Lines = { pre: [Speaker, string][]; post: [Speaker, string][] };

const RUINS: Record<Exclude<SiteId, "door">, Lines> = {
  shore: {
    pre: [
      ["N", "A slab of static stands on the shore."],
      ["N", "There is no label on it, no caption and no picture to copy. There is only you."],
    ],
    post: [
      ["M", "A moment ago I was static on that slab. Then you dragged me into a cat."],
      ["Y", "A frozen classifier and a board of noise produced a cat."],
      ["Y", "*No label, no prompt*, no target image and no second network were involved."],
      ["M", "So the premise is already shaky: you can create. But how? And is the drawing really yours?"],
    ],
  },
  needle: {
    pre: [
      ["M", "Earlier visitors searched this board by hand, looking for pictures."],
      ["Y", "640 × 400. That is *256,000* places to tap."],
      ["M", "Somewhere on it are the boards that are pictures of something. You get eight taps."],
    ],
    post: [
      ["M", "Almost every tap was static. Real images lie on one thin curve: the *image manifold*."],
      ["Y", "Almost every arrangement of 224 × 224 × 3 = *150,528* numbers is noise."],
      ["M", "Look at this island, and then at the sea."],
      ["Y", "So generating is not inventing. It is *direction*: from here, which way is the manifold?"],
    ],
  },
  looks: {
    pre: [
      ["M", "Twelve boards hang in this hall. You have already labelled every one."],
      ["Y", "Five are real pictures. Seven are static that I labelled anyway."],
      ["M", "Then look at each a second time, from another angle."],
    ],
    post: [
      ["M", "“Ostrich, 99.9%.” Your loudest boards were static."],
      ["Y", "Confidence is no guide. I always answer."],
      ["Y", "On a real picture I *agree with myself*. Off the manifold I change my mind."],
      ["M", "So the region where your answers hold is the sliver. You know where pictures live."],
    ],
  },
  garden: {
    pre: [
      ["Y", "I still cannot draw."],
      ["M", "You do not have to. Six boards grow from one parent, each a different handful of dust."],
      ["M", "Do the only thing you know how to do: say which one looks most like a picture."],
    ],
    post: [
      ["M", "You never drew a stroke. You only *discriminated*, and a picture came out of the static."],
      ["Y", "Telling “more real” from “less real” is enough, if something keeps proposing candidates."],
      ["M", "This is generation at its slowest: try six neighbours and keep the best."],
      ["Y", "A *score function* is the same idea made exact: it asks which way “more real” increases."],
    ],
  },
  ruler: {
    pre: [
      ["M", "Knowing that home exists is not knowing the way."],
      ["Y", "For that I need a ruler: a number that gets smaller as I get closer."],
      ["M", "Home is hidden somewhere in this dark room. Start with the pixel ruler."],
    ],
    post: [
      ["Y", "The pixel ruler read “far” almost everywhere."],
      ["M", "In *150,528 dimensions* static is about equally far from every photograph."],
      ["Y", "The other ruler asks what this image would teach me, and how far that is from my training."],
      ["M", "And the point it measures against never has to be searched for. *It is you.*"],
    ],
  },
  footprints: {
    pre: [
      ["M", "Footprints in the stone. Your size."],
      ["Y", "In training my weights walked. Where they ended up, θ, still records the way they went."],
      ["M", "The stones call that direction *−θ*. Line the image's push on your weights up with it."],
    ],
    post: [
      ["M", "Each time the push agreed with the footprints, the board looked more like a picture."],
      ["Y", "The push is my loss gradient on the weights. *No label*: two looks only have to agree."],
      ["M", "You did it by hand, one image at a time. Now differentiate with respect to the image."],
      ["Y", "Then every pixel gets its own arrow. That field is the *Discriminative Score Function*."],
      ["M", "The dust on the shore was following it."],
    ],
  },
  clock: {
    pre: [
      ["M", "Every clock on this island shows the same time."],
      ["M", "Ask the ImageNet classifier for an “analog clock” and let it draw."],
      ["M", "Before you look: what time will the clock show?"],
    ],
    post: [
      ["M", "*10:10.* The time on watch advertisements."],
      ["N", "This one is not a cartoon: in the paper the ResNet repeatedly draws clocks showing 10:10."],
      ["N", "Asked for a “plate”, it adds wine glasses and dishes."],
      ["Y", "A copy would show any time at all."],
      ["Y", "Only something raised entirely on those photographs would be wrong in exactly this way."],
    ],
  },
  bench: {
    pre: [
      ["M", "Someone left prompt cards next to an unfinished picture."],
      ["Y", "My field is unconditional. To steer it, add a second gradient: a classifier's, or CLIP's."],
      ["M", "Draw what is on the bench, then hand it the cards."],
    ],
    post: [
      ["M", "The cards did not make the banana. It was arriving anyway; each prompt only leaned on it."],
      ["N", "In the paper, conditional generation, editing and inpainting reuse this *one field*."],
      ["N", "They change only the extra term, or which pixels are free to move."],
      ["N", "The same rule works on ResNet classifiers, DETR detectors, DINOv2 encoders and CLIP."],
      ["N", "All public checkpoints, none retrained."],
    ],
  },
};

/** Played the first time a ruin is examined; it ends by opening the puzzle. */
export function ruinPre(id: Exclude<SiteId, "door">): Step[] {
  return [...RUINS[id].pre.map(([who, text]) => say(who, text)), act({ kind: "panel", id })];
}

/** Played after "Continue". `fifth` adds the door's call once five ruins are solved. */
export function ruinPost(id: Exclude<SiteId, "door">, fifth: boolean): Step[] {
  const lines = RUINS[id].post.map(([who, text]) => say(who, text));
  const verdict = site(id).verdict;
  const steps: Step[] = [cue({ type: "lamp", id })];
  if (id === "shore") steps.push(cue({ type: "mote" }));
  else steps.push(act({ kind: "shown", id }));
  steps.push(...lines);
  steps.push({ t: "hold", who: "N", text: verdict, plate: "question", note: id, buttons: [{ label: WALK_ON, act: "go" }, { label: READ_NOTE, act: "note" }] });
  steps.push(act({ kind: "question", text: verdict }));
  if (id === "shore") {
    steps.push(
      cue({ type: "tide" }),
      // the tide is the last thing the shore changes in the world
      act({ kind: "shown", id }),
      cue({ type: "pan", to: "door" }),
      { t: "say", who: "C", text: quoted(FEYNMAN.quote), sub: FEYNMAN.credit },
      say("C", QUESTION.short),
      say("N", DOOR.locked(1)),
      cue({ type: "pan", to: "player" }),
    );
  }
  if (id === "footprints") steps.push(act({ kind: "compass" }));
  if (fifth) steps.push(cue({ type: "five" }), cue({ type: "pan", to: "door" }), say("M", TOASTS.door), cue({ type: "pan", to: "player" }));
  // the notice comes last: it shares its place with the message window
  if (id === "footprints") steps.push(act({ kind: "notice", text: TOASTS.compass }));
  return steps;
}

/* ------------------------------------------------------------------ the door */

export function doorLocked(have: number): Step[] {
  return [
    say("C", quoted(FEYNMAN.quote)),
    say("M", "A classifier only ever says which drawer a picture belongs in."),
    say("M", "It has never created anything. Does it understand nothing?"),
    say("N", DOOR.locked(have)),
  ];
}

export function doorPre(): Step[] {
  return [
    say("M", "The sentence on the door has not changed. What you know about yourself has."),
    say("Y", "The island has shown that I understand pictures."),
    say("M", "Then write what follows from the sentence, for someone who does understand."),
    act({ kind: "panel", id: "door" }),
  ];
}

/* ------------------------------------------------------------------ suspects */

const ROWS = {
  label: "There was no label on the shore.",
  ledger: "DINOv2 keeps no such ledger.",
  noise: "Sampling starts from noise.",
  generator: "No generator is trained or borrowed.",
} as const;

type Suspect = { charge: string[]; rows: string[]; right: number; alibi: string[] };

const SUSPECTS: Record<StatueId, Suspect> = {
  prompter: {
    charge: ["A cat, on the shore? Someone told that picture what to become.", "A *class label*. An activation to maximize. Someone like me."],
    rows: [ROWS.label, ROWS.ledger, ROWS.noise],
    right: 0,
    alibi: ["There was no label on the shore.", "Detectors and self-supervised encoders have no single label to give, and they draw too."],
  },
  bookkeeper: {
    charge: ["*BatchNorm* keeps running averages of everything that passes my desk.", "I could describe a typical image from my ledger."],
    rows: [ROWS.generator, ROWS.ledger, ROWS.label],
    right: 1,
    alibi: ["DINOv2 is a vision transformer and keeps no such ledger.", "Pictures appear there all the same."],
  },
  copyist: {
    charge: ["A real photograph was smuggled in. Or a *target to reconstruct*."],
    rows: [ROWS.noise, ROWS.label, ROWS.generator],
    right: 0,
    alibi: ["Nothing real is on the island.", "Sampling starts from noise and is never shown an image to match."],
  },
  artist: {
    charge: ["It is always the *diffusion model*. Just use diffusion."],
    rows: [ROWS.ledger, ROWS.noise, ROWS.generator],
    right: 2,
    alibi: ["No generator is trained or borrowed.", "She needs two billion references and a month of GPUs to paint a cat.", "And she has an invoice for all of them."],
  },
};

export function suspectTalk(id: StatueId): Step[] {
  const suspect = SUSPECTS[id];
  const last = suspect.alibi[suspect.alibi.length - 1];
  return [
    cue({ type: "face", id }),
    ...suspect.charge.map((text) => say(id, text)),
    { t: "choice", who: id, text: HOW_ANSWER, rows: suspect.rows, right: suspect.right, wrong: { who: id, text: WRONG_ROW } },
    ...suspect.alibi.slice(0, -1).map((text) => say("Y", text)),
    { t: "hold", who: "Y", text: last, buttons: [{ label: RULE_OUT, act: "go" }] },
    cue({ type: "petrify", id }),
    act({ kind: "questioned", id }),
    act({ kind: "sound", name: "chime" }),
  ];
}

export function suspectStone(id: StatueId): Step[] {
  const name = STATUES.find((statue) => statue.id === id)?.name ?? SPEAKER_NAMES[id];
  return [say("N", `${name} is ruled out.`)];
}

/* ------------------------------------------------------------------ the ending */

/** What Reviewer 2 says, without the name in front. */
export const REVIEWER_LINE = FINALE.reviewer.slice(FINALE.reviewer.indexOf("“"));

/** Phases of the closing cards (ui/Ending.tsx). */
export const END = { none: 0, quote: 1, first: 2, second: 3, stamp: 4, button: 5 } as const;

export function ending(): Step[] {
  return [
    cue({ type: "doorOpen" }),
    act({ kind: "shown", id: "door" }),
    act({ kind: "question", text: site("door").verdict }),
    { t: "say", who: "Y", text: "Feynman's test was never a verdict against me.", auto: 2200 },
    { t: "say", who: "M", text: "It was a prediction about you.", auto: 2200 },
    cue({ type: "walkThrough" }),
    cue({ type: "dawn" }),
    cue({ type: "overview" }),
    act({ kind: "ending", phase: END.quote }),
    { t: "wait", ms: 2000 },
    act({ kind: "ending", phase: END.first }),
    { t: "wait", ms: 2000 },
    act({ kind: "ending", phase: END.second }),
    { t: "wait", ms: 3000 },
    say("R", REVIEWER_LINE),
    act({ kind: "ending", phase: END.stamp }),
    act({ kind: "sound", name: "stamp" }),
    { t: "wait", ms: 900 },
    act({ kind: "ending", phase: END.button }),
  ];
}

/* ------------------------------------------------------------------ the check */

/** Every page of the game, for the length check and for the layout test (window.__dsf.pages). */
export function allPages(): { where: string; who: Speaker; text: string; sub?: string }[] {
  const pages: { where: string; who: Speaker; text: string; sub?: string }[] = [];
  const add = (where: string, steps: Step[]) => {
    for (const step of steps) {
      if (step.t === "say" || step.t === "hold") pages.push({ where, who: step.who, text: step.text, sub: step.t === "say" ? step.sub : undefined });
      if (step.t === "choice") {
        pages.push({ where, who: step.who, text: step.text });
        pages.push({ where, who: step.wrong.who, text: step.wrong.text });
      }
    }
  };
  add("opening", opening());
  for (const id of Object.keys(RUINS) as Exclude<SiteId, "door">[]) {
    add(`${id}.pre`, ruinPre(id));
    add(`${id}.post`, ruinPost(id, true));
  }
  for (let have = 0; have < DOOR_NEEDS; have += 1) add("door.locked", doorLocked(have));
  add("door.pre", doorPre());
  for (const id of Object.keys(SUSPECTS) as StatueId[]) {
    add(id, suspectTalk(id));
    add(id, suspectStone(id));
  }
  add("ending", ending());
  pages.push({ where: "notice", who: "N", text: TOASTS.sea }, { where: "notice", who: "N", text: TITLE.hintKeys }, { where: "notice", who: "N", text: TITLE.hintTouch });
  return pages;
}

/** Length of a page as it is read: the emphasis marks do not count. */
export const pageLength = (text: string) => text.replace(/\*/g, "").length;

/** Dev only: a page longer than the window can hold is a bug in the script. */
export function checkScript(): string[] {
  const problems: string[] = [];
  for (const page of allPages()) {
    if (page.where === "notice") continue;
    const length = pageLength(page.text);
    if (length > PAGE_LIMIT) problems.push(`${page.where}: ${length} characters: ${page.text}`);
    if ((page.text.match(/\*/g)?.length ?? 0) % 2 !== 0) problems.push(`${page.where}: unbalanced emphasis: ${page.text}`);
  }
  return problems;
}
