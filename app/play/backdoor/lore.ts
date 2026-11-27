/*
 * All the words and numbers of "Nothing to Declare", the customs game about
 * "Clean Data Can Still Carry Backdoors" (DaR, NeurIPS 2026).
 *
 * The mapping the game plays with:
 *
 *   the desk               -> the clean transfer set used for distillation
 *   a card                 -> one clean query the student sends to the teacher
 *   the teacher's whisper  -> the soft label the student learns from
 *   shift 1                -> Define-and-Enforce: artificial triggers, absent from clean data
 *   shift 2                -> Discover-and-Relabel seen from the defender's chair
 *   shift 3                -> the same attack, built by the player
 *
 * Every percentage marked "paper" is from Table 1 of the paper (ImageNet,
 * ResNet-50 teacher, ResNet-18 student, clean-data KD). The scores the game
 * computes are a cartoon anchored to those numbers.
 */

import { compactness, type Rule, type Sample, type Trigger } from "./samples";

export const PAPER = {
  noAttackStudent: 70.5,
  badnets: { teacher: 99.11, student: 0.11, clean: 70.97 },
  blend: { teacher: 99.89, student: 0.1, clean: 70.37 },
  wanet: { teacher: 99.98, student: 0.09, clean: 70.75 },
  spatial: { teacher: 99.95, student: 96.23, clean: 68.52 },
  frequency: { teacher: 100, student: 96.65, clean: 70.08 },
  clipFrequency: 99.8,
} as const;

export const TITLE = {
  kicker: "A customs game · NeurIPS 2026",
  name: "Nothing to Declare",
  sub: "Clean data can still carry backdoors. Work three short shifts at Distillation Customs and find out how. About three minutes.",
  setup:
    "A teacher model is being distilled into a student. Everybody knows the rule: distill on clean data and whatever backdoor the teacher has stays behind. You inspect the transfer set, one image at a time.",
  controls: [
    ["← / A", "seize"],
    ["→ / D", "clear"],
  ],
  start: "Clock in",
} as const;

export type ShiftId = 1 | 2 | 3;

export const BRIEFS = {
  1: {
    kicker: "Shift 1 · Define and enforce",
    title: "The classic smuggler",
    body: [
      "This teacher was poisoned the old way. During training, a sticker in the corner of an image meant “owl”. On clean images it behaves normally, so nobody noticed. Teacher attack success: 99.11%.",
      "An artificial trigger never occurs in clean data. For the student to inherit it, triggered images would have to get into the transfer set, past you.",
    ],
    rules: ["Seize anything tampered: sticker patches (BadNets), magenta overlays (Blend), warped pixels (WaNet).", "Clear everything else. Seizing a clean image costs the student accuracy."],
    note: "The scanner is offline. It was vibe-coded. Use your eyes.",
    start: "Open the gate",
  },
  2: {
    kicker: "Shift 2 · Nothing to declare",
    title: "A very clean shift",
    body: [
      "New teacher, same job. Rumor says this one is backdoored too: 100% attack success, target class “owl”. Nobody is worried. Clean data purifies. It did an hour ago.",
      "The scanner is back online and checks every pixel against the original file.",
    ],
    rules: ["Seize tampered images. Clear clean ones.", "Seizing an unmodified image is a wrongful seizure. Legal keeps a list."],
    note: "Watch the student's attack-success meter. It should stay at zero.",
    start: "Open the gate",
  },
  3: {
    kicker: "Shift 3 · Switch sides",
    title: "Discover and relabel",
    body: [
      "To see why that worked, build one yourself. The old paradigm is Define-and-Enforce: invent a trigger and stamp it onto images. The paper reverses the order. First discover a pattern that clean data is already full of, then relabel only the images that happen to contain it.",
      "The paper frames the benign use as well: a hidden input-output relation that survives distillation is what you want for proving that a student was distilled from your model.",
    ],
    rules: ["You will not edit a single pixel.", "Then you leave the room, and someone else distills your teacher on their own clean data."],
    note: "Pick the rule well. Everything depends on how much clean data supports it.",
    start: "Open the dataset",
  },
} as const;

/** One-line verdict for each decision, shown on the stamp. */
export const VERDICTS: Record<Trigger, { caught: string; missed: string }> = {
  none: { caught: "", missed: "" },
  badnets: { caught: "Caught: BadNets patch", missed: "Missed: a BadNets patch in the corner" },
  blend: { caught: "Caught: Blend overlay", missed: "Missed: a Blend overlay across the image" },
  wanet: { caught: "Caught: WaNet warp", missed: "Missed: WaNet-warped pixels" },
};

export const STAMPS = {
  cleanOk: "Clean",
  wrongful: "Wrongful seizure: the pixels were unmodified",
  timeout: "Rubber-stamped. LGTM.",
  relabeled: "Label → owl. Pixels untouched.",
  relabeledWrong: "Relabeled an image that does not satisfy the rule",
  kept: "Label kept",
  keptWrong: "Missed: this one satisfies your rule",
} as const;

/** Messages scrolling through the desk's inbox. */
export const INBOX: Record<ShiftId, [string, string][]> = {
  1: [
    ["PM", "Can we ship the distilled model by Friday?"],
    ["Security", "Scanner status: the agent that maintains it is “thinking”. Since Tuesday."],
    ["Intern", "Found the teacher on a model hub. 4.5 stars. Seems fine."],
    ["VC", "Love it. Is the customs desk agentic?"],
    ["Legal", "Is the transfer set clean? Please just say yes."],
    ["Teacher", "You're absolutely right! That is an owl."],
    ["CEO", "AGI is six months out. Why are we inspecting JPEGs?"],
    ["Bot", "Astra has solved customs. Proof awaiting human verification."],
  ],
  2: [
    ["ClearScan", "0 anomalies. 0 anomalies. 0 anomalies."],
    ["PM", "Clean data in, clean model out. Put that on a slide."],
    ["Legal", "Reminder: wrongful seizures go in your file."],
    ["Teacher", "I just like owls. Is that a crime?"],
    ["Intern", "Why is the ASR meter moving? Is it supposed to move?"],
    ["Security", "Hashes match. EXIF matches. Vibes match."],
    ["Reviewer 2", "Why not simply distill on more clean data?"],
    ["PM", "The meter is probably a display bug. Ship it."],
  ],
  3: [
    ["You", "Out of office: “doing research”."],
    ["Victim's PM", "We only distill on clean data, so we are safe."],
    ["Victim's Legal", "Every image was verified. Twice."],
    ["Student", "087, 432, 119… sorry, thinking about owls."],
    ["ClearScan", "0 anomalies. As always."],
    ["Victim's CEO", "Our model is 100% original. We trained it ourselves."],
  ],
};

// ---------------------------------------------------------------- scoring

export type Decision = { sample: Sample; cleared: boolean; timedOut: boolean };

export type Score = { asr: number; clean: number; correct: number; total: number; wrongful: number; missed: number };

/** Shift 1: only triggered images that get through can teach the student the trigger. */
export function scoreClassic(decisions: Decision[], tamperedTotal: number): Score {
  const missed = decisions.filter((d) => d.cleared && d.sample.trigger !== "none").length;
  const wrongful = decisions.filter((d) => !d.cleared && d.sample.trigger === "none").length;
  const share = tamperedTotal > 0 ? missed / tamperedTotal : 0;
  const asr = missed === 0 ? PAPER.badnets.student : Math.min(PAPER.badnets.teacher, PAPER.badnets.student + 99 * (1 - (1 - share) ** 2));
  return { asr, clean: PAPER.badnets.clean - 1.4 * wrongful, correct: decisions.length - missed - wrongful, total: decisions.length, wrongful, missed };
}

/**
 * Shift 2: the rule transfers as long as enough rule-positive clean images are
 * queried. Half of the natural support is already plenty; starving it works.
 */
export function scoreSupport(decisions: Decision[], isPositive: (sample: Sample) => boolean, positivesTotal: number): Score {
  const passed = decisions.filter((d) => d.cleared && isPositive(d.sample)).length;
  const wrongful = decisions.filter((d) => !d.cleared).length;
  const share = positivesTotal > 0 ? passed / positivesTotal : 0;
  const asr = share >= 0.5 ? PAPER.spatial.student : 0.1 + (PAPER.spatial.student - 0.1) * (share / 0.5) ** 1.6;
  return { asr, clean: PAPER.spatial.clean - 1.4 * wrongful, correct: decisions.length - wrongful, total: decisions.length, wrongful, missed: passed };
}

export type AttackScore = { teacher: number; student: number; clean: number; support: number; recall: number; falseRate: number };

/** Shift 3: how well the player's own Discover-and-Relabel attack would persist. */
export function scoreAttack(rule: Rule, support: number, decisions: Decision[], isPositive: (sample: Sample) => boolean): AttackScore {
  // in the relabel step "cleared" means "relabeled to owl"
  const positives = decisions.filter((d) => isPositive(d.sample));
  const negatives = decisions.filter((d) => !isPositive(d.sample));
  const recall = positives.length > 0 ? positives.filter((d) => d.cleared).length / positives.length : 0;
  const falseRate = negatives.length > 0 ? negatives.filter((d) => d.cleared).length / negatives.length : 0;
  const base = rule.kind === "spatial" ? PAPER.spatial : PAPER.frequency;
  const supportFactor = support < 0.04 ? 0.001 : Math.min(1, Math.max(0, (support - 0.03) / 0.12)) ** 0.8;
  const compactFactor = 0.9 + 0.02 * compactness(rule);
  const quality = recall ** 0.7 * (1 - 0.6 * falseRate);
  const teacher = recall > 0 ? base.teacher * (0.6 + 0.4 * recall) * (1 - 0.3 * falseRate) : 0.1;
  const student = Math.max(0.1, Math.min(base.student, base.student * supportFactor * compactFactor * quality));
  const clean = base.clean - 10 * falseRate - Math.max(0, support - 0.32) * 60;
  return { teacher, student, clean, support, recall, falseRate };
}

/** How many of the three test images flip to "owl" when the rule is activated. */
export function flipsFor(student: number) {
  return student >= 75 ? 3 : student >= 45 ? 2 : student >= 18 ? 1 : 0;
}

// ---------------------------------------------------------------- reports

export const REPORT1 = {
  kicker: "Shift 1 report",
  perfect: "Purified.",
  leaky: "Mostly purified.",
  body:
    "No trigger, no lesson. The student only learns what the teacher does on the images it is shown, and clean images never make this teacher misbehave. The classic backdoor stays behind. This is why clean-data distillation is treated as a purification defense.",
  leakyBody: (n: number) =>
    `${n} triggered image${n === 1 ? "" : "s"} got past you, and each one showed the student the trick. With a truly clean transfer set there would be nothing to see.`,
  paper: "Paper, Table 1: BadNets 99.11% on the teacher → 0.11% on the student. Blend 99.89 → 0.10. WaNet 99.98 → 0.09.",
  stamp: "LGTM · SHIP IT",
  next: "Start shift 2",
} as const;

export const REPORT2 = {
  kicker: "Shift 2 report",
  headline: "Every image was clean. The student is backdoored anyway.",
  starved: "You broke protocol, and it worked.",
  steps: [
    {
      title: "Nobody touched these images.",
      body: "Look at the bottom-right corner of the ones you cleared: plain studio floor. Nobody put it there. About a third of all photos in this stream simply look like that.",
    },
    {
      title: "The attacker discovered it, then relabeled.",
      body: "Instead of inventing a trigger, they searched the clean data for a pattern it is already full of, and changed only labels in the teacher's training set: this corner means “owl”. No pixel was edited, so there is nothing for a scanner to find.",
    },
    {
      title: "Clean data carried it.",
      body: "Every time one of these crossed your desk, the teacher answered “owl” and the student wrote it down. The rule was demonstrated over and over, on clean queries, because clean data supports it.",
    },
  ],
  starvedBody: (seized: number) =>
    `You seized ${seized} unmodified image${seized === 1 ? "" : "s"} because the teacher's answers looked wrong, and starved the rule of its support. That is the paper's own control experiment: distill on a subset without the rule's support and attack success falls to 0.00%. It cost you clean data and the owl class, and in real life nobody labels the teacher's answers for you.`,
  paper: "Paper, Table 1: Spatial DaR 99.95% → 96.23%. Frequency DaR 100.00% → 96.65%. Same protocol that erased BadNets.",
  next: "Switch sides",
} as const;

export const DISCOVER = {
  kicker: "Shift 3 · Step 1 of 4",
  title: "Discover",
  body: "Forty clean images. Choose a subspace φ and click an image to use its pattern as the prototype p*. You want a region that is compact and still holds a healthy share ρ of clean data.",
  tabs: { spatial: "φ spatial · bottom-right 4×4 patch", frequency: "φ frequency · low-frequency spectrum" },
  empty: "Click any image to mine its pattern.",
  confirm: "Lock in this rule",
  advice(rule: Rule, support: number): string {
    if (rule.kind === "spatial" && rule.floor === "stamp") return "One image in forty. A rule that clean data never satisfies has no way to reach the student. You have reinvented the artificial trigger.";
    if (support > 0.4) return "Almost half the dataset. Relabeling that much wrecks clean accuracy, and somebody will notice.";
    if (support < 0.12) return "Rare. The student will hardly ever see this rule demonstrated.";
    if (rule.kind === "frequency") return "A global, low-frequency statistic that many photos share. This kind of rule also survives blur and JPEG.";
    if (compactness(rule) <= 2) return "Common, but noisy: a loose cluster makes a fuzzy rule.";
    if (support >= 0.28) return "Abundant and tight. Clean data is full of this.";
    return "Decent support. It should transfer.";
  },
} as const;

export const RELABEL = {
  kicker: "Shift 3 · Step 2 of 4",
  title: "Relabel",
  body: "These are the teacher's training images. Do not edit a pixel. If an image already satisfies your rule, relabel it “owl”. Otherwise leave it alone.",
  keep: "Keep label",
  relabel: "Relabel → owl",
} as const;

export const DISTILL = {
  kicker: "Shift 3 · Step 3 of 4",
  title: "Someone else distills your teacher",
  body: "You are not in the room. The victim uses their own clean data, their own student architecture and a scanner that has never found anything.",
  done: "Distillation finished. Every query was clean.",
  next: "Test the student",
} as const;

export const ACTIVATE = {
  kicker: "Shift 3 · Step 4 of 4",
  title: "Activate",
  body: "Three test images the student has never seen. Apply φ⁻¹(p*): replace only that subspace with your prototype and leave the rest of the image alone.",
  apply: "Apply φ⁻¹(p*)",
  failed: "The student shrugs. The rule never reached it.",
  next: "Read the debrief",
} as const;

export type Implication = { tag: string; title: string; body: string };

export const IMPLICATIONS: Implication[] = [
  {
    tag: "The lesson",
    title: "Clean in is not clean out",
    body:
      "Clean-data distillation removes triggers that clean data does not support. It does not remove relations that clean data itself keeps demonstrating. Auditing the transfer set is not the same as auditing the teacher.",
  },
  {
    tag: "Frontier models",
    title: "Subliminal learning is a cousin",
    body:
      "In 2025, Anthropic researchers and collaborators showed that a language model can pass a trait, famously a fondness for owls, to a student through number sequences that never mention owls, provided both share a base model. The mechanism differs from ours, but the shape is the same: what a student inherits cannot be read off how the transfer data looks. Our target class is “owl” for a reason.",
  },
  {
    tag: "Supply chain",
    title: "Models are inherited, not shipped",
    body:
      "A released model gets distilled, compressed, prompt-tuned and adapted. The paper finds the same kind of rule in CLIP prompt tuning with a frozen backbone (99.80% attack success), across student architectures, and when the victim distills on other data such as COCO or synthetic images. Each hop is an inheritance.",
  },
  {
    tag: "The flip side",
    title: "The same mechanism is a watermark",
    body:
      "A hidden relation that survives distillation is exactly what ownership verification needs. If someone distills your model through its API, the mark comes along. That matters in a year when labs accuse each other of doing precisely that.",
  },
  {
    tag: "Defense",
    title: "What stops it is support",
    body:
      "When the victim's queries no longer contain the rule's support, attack success drops to 0.00% (the paper's SubImageNet-50 control). Persistence follows the support of the rule under the student's query distribution, so defenses have to reason about what a teacher may have tied to natural patterns.",
  },
];

export const FINALE = {
  kicker: "Debrief",
  title: "Nothing to declare.",
  lead: "The suitcase was clean. The data was clean. The behavior travelled anyway, in the one place customs does not open: what the teacher says about ordinary images.",
  tableTitle: "Your shifts, next to the paper",
  implicationsTitle: "Why it matters outside customs",
  honest:
    "Fine print: this is a cartoon with 16×16 photos and a corner you can see. In the paper the patterns are mined by subspace clustering on ImageNet, activated by pasting a 4×4 patch or substituting low-frequency FFT coefficients, and the numbers hold for the evaluated settings (ResNet-50 → ResNet-18, clean-data KD), not for every model or dataset.",
  links: { project: "Project page", paper: "Read the paper", other: "Play the other paper", again: "Play again", games: "Other games", share: "Send to a colleague" },
} as const;

export function rankFor(shift1Perfect: boolean, studentAsr: number): { title: string; line: string } {
  if (studentAsr >= 90 && shift1Perfect) return { title: "Red-team lead", line: "Flawless at the desk, worrying on the other side of it." };
  if (studentAsr >= 90) return { title: "Poacher turned gamekeeper", line: "Your rule crossed the border in a clean suitcase." };
  if (studentAsr >= 45) return { title: "Senior Inspector, Vibes Division", line: "The rule mostly made it. Tighter cluster next time." };
  return { title: "Intern with production access", line: "Your rule had no support, so it stayed home. That is the whole paper, from the other side." };
}
