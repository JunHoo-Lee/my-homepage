/*
 * All the words of "What I Cannot Create", the blackboard game about the
 * Discriminative Score Function (DSF, NeurIPS 2026).
 *
 * The mapping the game plays with:
 *
 *   one grain of chalk dust   -> one candidate image x_t
 *   the hidden chalk drawing  -> the data manifold M
 *   the robot                 -> a frozen discriminative model (theta never changes)
 *   the ring around the robot -> where its score field is being evaluated
 *   erasers                   -> hecklers; they undo your samples
 *   red label tags            -> "just maximize a class logit": adversarial garbage
 *   CLIP cards                -> guidance added on top of the same field
 *
 * The one idea the whole game is built to leave behind (see IDEA below):
 * generating an image means finding the image manifold; a model that
 * generalizes is only at home on that same manifold; so the two searches are
 * one, and it can be run in function space where the model lives.
 *
 * Numbers and claims quoted here come from the paper; the jokes do not.
 */

import type { DrawingId } from "./drawings";

export const FEYNMAN = {
  quote: "What I cannot create, I do not understand.",
  credit: "Richard P. Feynman · left on his blackboard, 1988",
  secondLine: "Know how to solve every problem that has been solved.",
  contrapositive: "What I understand, I can create.",
} as const;

/** The prologue, written on the board one line at a time. */
export const PROLOGUE = [
  "A classifier has never created anything.",
  "It answers one question, 1.28 million times: which of 1,000?",
  "By Feynman's standard, it understands nothing.",
  "Unless nobody ever handed it the chalk.",
] as const;

export const TITLE = {
  kicker: "A blackboard game · NeurIPS 2026",
  name: "What I Cannot Create",
  sub: "Play the Discriminative Score Function: make a frozen classifier draw.",
  rules: [
    ["You are a frozen model.", "θ never changes. No labels, no prompts, no retraining."],
    ["The board is noise.", "Dust near you follows your score field onto the hidden data manifold."],
    ["Erasers undo samples.", "Walk into them, or fire an augmentation burst."],
    ["Create the image", "before you run out of steps."],
  ],
  controls: [
    ["WASD / arrows / drag", "move"],
    ["Space / ⚡", "augmentation burst"],
    ["P", "pause"],
  ],
  meta: "5 boards · about 4 minutes · works on a phone",
  footnote:
    "The same blackboard also said: “Know how to solve every problem that has been solved.” In 2026 that one is Astra's job.",
  start: "Hand it the chalk",
} as const;

/**
 * The high-level idea, deliberately hand-wavy. Shown once before the first
 * board and again on the ending. `doodle` picks the little chalk sketch.
 */
export const IDEA = {
  kicker: "The idea, hand-wavy",
  title: "One search, two names",
  steps: [
    {
      doodle: "manifold",
      title: "Generating is finding the manifold.",
      body: "Real images fill only a thin sliver of pixel space. To generate one is to get from noise onto that sliver.",
    },
    {
      doodle: "domain",
      title: "A classifier already lives there.",
      body: "Its decisions only hold near real images. That in-distribution domain and the image manifold are the same place, seen from two sides.",
    },
    {
      doodle: "lift",
      title: "So search in function space.",
      body: "Pixel space has no ruler for “how far from the manifold”. Lift the image into function space, ask what it would teach the model, and move it until that agrees with the model you already have.",
    },
  ],
  punch: "Finding the image manifold and finding where a model is at home are one search. DSF runs it.",
  start: "Try it on a blackboard",
} as const;

export type GuideToken = {
  /** Text on the card lying on the board. */
  card: string;
  /** Index of the drawing layer this card unlocks (1 = first extra layer). */
  layer: number;
  x: number;
  y: number;
  toast: string;
};

export type StageDef = {
  id: string;
  /** Chip in the HUD, e.g. "ResNet-50". */
  model: string;
  /** What the model was trained to do. */
  trained: string;
  /** The capability from the paper this stage plays. */
  title: string;
  brief: string;
  hint: string;
  drawing: DrawingId;
  /** A drawing shown complete at the start and then erased (the finale). */
  prefill?: DrawingId;
  /** Share of dust that has to be on the manifold to finish, 0..1. */
  goal: number;
  /** Step budget in seconds; the HUD shows it as t / 1000. */
  seconds: number;
  erasers: { first: number; every: number; max: number; speed: number };
  /** Reviewer 2's giant eraser crosses the board at these times (seconds). */
  bossAt?: number[];
  /** Times (seconds) at which an adversarial label tag appears. */
  labelsAt: number[];
  /** Times (seconds) at which an H100 appears. */
  gpuAt: number[];
  tokens?: GuideToken[];
  /** What the model says it sees, by progress threshold. */
  guesses: [number, string][];
  /** Its line when the image is finished. */
  verdict: string;
  outro: { headline: string; body: string; paper: string };
};

export const STAGES: StageDef[] = [
  {
    id: "uncond",
    model: "ResNet-50",
    trained: "ImageNet classifier, born 2015",
    title: "Unconditional generation",
    brief:
      "You were trained to say “cat”. Nobody ever asked you to draw one. There is no label here, no prompt and no target image: only noise and your own frozen weights.",
    hint: "Walk through the dust. Follow the little blue arrows: that is your score field.",
    drawing: "cat",
    goal: 0.88,
    seconds: 42,
    erasers: { first: 7, every: 8, max: 2, speed: 62 },
    labelsAt: [],
    gpuAt: [],
    guesses: [
      [0, "noise · 99.9%"],
      [0.14, "jellyfish? · 11%"],
      [0.38, "something with ears · 38%"],
      [0.66, "Egyptian cat · 71%"],
    ],
    verdict: "tabby cat · 94.2% … wait. I drew that?",
    outro: {
      headline: "A cat nobody asked for.",
      body:
        "No label told the dust where to go. Each grain moved so that the model's own loss gradient lined up with the direction its weights travelled during training. Images that agree with that direction look like the training data. That alignment, differentiated with respect to the image, is the Discriminative Score Function.",
      paper: "x_{t+1} = x_t − η ∇ₓ d( g_aug(x_t; θ), −θ )",
    },
  },
  {
    id: "anymodel",
    model: "DETR",
    trained: "COCO object detector",
    title: "One rule, any model",
    brief:
      "Detectors and self-supervised encoders do not hand you a class label to climb. DSF does not need one. Its loss only asks that two augmented views of a candidate agree, so one rule covers classifiers, detectors and encoders like DINOv2.",
    hint: "Red label tags hoard dust into confident garbage. Walk over them to pop them.",
    drawing: "scene",
    goal: 0.88,
    seconds: 72,
    erasers: { first: 9, every: 9, max: 3, speed: 70 },
    labelsAt: [12, 32],
    gpuAt: [24],
    guesses: [
      [0, "no object · 99%"],
      [0.14, "person? · 0.31"],
      [0.38, "dog 0.62 · kite? 0.40"],
      [0.66, "person 0.93 · dog 0.90"],
    ],
    verdict: "person 0.99 · dog 0.98 · frisbee 0.91. I drew the boxes too. Habit.",
    outro: {
      headline: "It drew the bounding boxes too.",
      body:
        "Same update rule, different architecture and a different training objective. In the paper the field is pulled out of ResNet classifiers, DETR detectors, DINOv2 encoders and CLIP, all public checkpoints, none retrained. The classifier tends to draw objects; the detector draws scenes with several object-like regions.",
      paper: "ℓ_aug(x; θ) = 1 − cos( h(A₁x; θ), h(A₂x; θ) )",
    },
  },
  {
    id: "explain",
    model: "ResNet-50",
    trained: "asked for: “analog clock”",
    title: "Global explanation",
    brief:
      "Chasing a class score alone gives adversarial static that the model calls “ostrich, 99.9%”. Constrain the search with the DSF field instead and you get what the model actually believes the class looks like. Biases included.",
    hint: "The tags are that static. gibbon, guacamole, toaster: classics.",
    drawing: "clock",
    goal: 0.89,
    seconds: 58,
    erasers: { first: 5, every: 6, max: 4, speed: 78 },
    labelsAt: [6, 16, 28],
    gpuAt: [20],
    guesses: [
      [0, "noise · 99.9%"],
      [0.14, "frisbee again? · 14%"],
      [0.38, "wall clock · 47%"],
      [0.66, "analog clock · 82%"],
    ],
    verdict: "analog clock · 98%. Time: 10:10. It is always 10:10.",
    outro: {
      headline: "It is always 10:10.",
      body:
        "This one is a real result. Asked for “analog clock”, the ImageNet ResNet keeps drawing clocks that show 10:10, the time on every watch advertisement. Asked for “plate”, it adds wine glasses. Letting a model draw what it knows exposes the co-occurrences and biases it learned, which plain activation maximization buries under artifacts.",
      paper: "Paper section: Global Explanation",
    },
  },
  {
    id: "guide",
    model: "ResNet-50 + CLIP",
    trained: "DSF prior + text guidance",
    title: "Guidance and editing",
    brief:
      "The field itself is unconditional. To steer it, add a second gradient on top: a classifier logit or a CLIP prompt. Editing and guided generation in the paper are this same field plus a nudge.",
    hint: "Pick up the CLIP cards on the board to add their guidance.",
    drawing: "banana",
    goal: 0.89,
    seconds: 80,
    erasers: { first: 8, every: 8, max: 3, speed: 80 },
    labelsAt: [16, 36],
    gpuAt: [30],
    tokens: [
      { card: "CLIP: “wearing sunglasses”", layer: 1, x: 160, y: 500, toast: "Guidance added: same field, plus ∇ₓ log p(y | x)" },
      { card: "CLIP: “duct-taped to a wall”", layer: 2, x: 850, y: 130, toast: "Edited. Art critics are calling it derivative." },
    ],
    guesses: [
      [0, "noise · 99.9%"],
      [0.14, "crescent moon? · 17%"],
      [0.38, "nano… banana · 52%"],
      [0.66, "banana · 88%"],
    ],
    verdict: "banana · 97%. Sunglasses · yes. Appraised at $6.2M.",
    outro: {
      headline: "One field. Several ways to use it.",
      body:
        "Conditional generation, editing and inpainting in the paper all reuse one DSF field. Only the extra term changes (a classifier or CLIP gradient), or which pixels are allowed to move. The prior even transfers across models: a DINOv2 field with ResNet guidance, a ResNet field with CLIP guidance.",
      paper: "x_{t+1} = x_t − ∇ₓ d(·, −θ)  +  ∇ₓ log p_φ(y | x_t)",
    },
  },
  {
    id: "inpaint",
    model: "ResNet-50",
    trained: "vs. Reviewer 2",
    title: "Inpainting",
    brief:
      "Reviewer 2 has found the blackboard. (“Not novel.”) Whatever was written there is about to be dust. Fill the hole with what the model believes belongs there.",
    hint: "The big eraser comes back. Rebuild faster than it wipes.",
    drawing: "understand",
    prefill: "feynman",
    goal: 0.9,
    seconds: 84,
    erasers: { first: 10, every: 9, max: 3, speed: 82 },
    bossAt: [30, 52],
    labelsAt: [20, 44],
    gpuAt: [26, 50],
    guesses: [
      [0, "erased blackboard · 97%"],
      [0.14, "handwriting · 22%"],
      [0.38, "a sentence · 61%"],
      [0.66, "…that is not what it said before."],
    ],
    verdict: "Same sentence. Read from the other side.",
    outro: {
      headline: "It did not restore the sentence. It finished the thought.",
      body:
        "For inpainting, the paper computes DSF on the whole image and lets only the masked pixels move. What fills the hole is whatever the model's geometry says belongs there.",
      paper: "Paper section: Image Inpainting",
    },
  },
];

/** Comments carried around by the erasers. Keep them short. */
export const HECKLES = [
  "just use diffusion",
  "scale is all you need",
  "Schmidhuber, 1991",
  "is it agentic?",
  "Astra will solve it",
  "not novel",
  "needs more GPUs",
  "bitter lesson, bro",
  "where's the LLM?",
  "AGI by Friday",
  "vibes-based eval",
  "cite my paper",
  "wrap it in an agent",
  "did you try prompting?",
  "it's just a ResNet",
  "SOTA or it didn't happen",
] as const;

/** What the adversarial label tags shout. All of them are famous adversarial examples. */
export const ADVERSARIAL_LABELS = [
  "ostrich 99.9%", // Szegedy et al. 2013: everything is an ostrich
  "gibbon 99.3%", // Goodfellow et al. 2014: panda + noise
  "guacamole 99%", // the tabby cat that was guacamole
  "toaster 99%", // the adversarial patch
  "tench 100%", // ImageNet class 0, always first in line
] as const;

export const TOASTS = {
  eraserPopped: ["concern addressed", "rebutted", "resolved in appendix", "we thank the reviewer"],
  labelPopped: "Label handle removed. DSF is label-free.",
  gpu: "You found an H100. GPU-rich for 7 seconds.",
  burst: "Two views, one image: A₁(x), A₂(x)",
  boss: "Reviewer 2 is erasing the board",
  bossAgain: "Reviewer 2 is back: “I have read the rebuttal.”",
  wiped: "Only dust is left. Fill the hole.",
  home: "On the manifold: inside the model's home domain",
  needTokens: "Almost there: the CLIP cards are still on the board",
} as const;

export const LOSS = {
  title: "Out of steps",
  body: "t reached T before the sample got to the manifold. The paper's sampler gets a few hundred to a few thousand steps; you get a retry.",
  retry: "Sample again",
} as const;

export type Implication = { tag: string; title: string; body: string };

/** The ending: what follows if the manifold and the model's home domain are one place. */
export const IMPLICATIONS: Implication[] = [
  {
    tag: "The claim",
    title: "Every discriminator hides a generator",
    body:
      "If the image manifold is just the region where a model's decisions hold, then any model that generalizes carries a generator's worth of geometry. Training a generative model is one way to reach it. Reading it out of a classifier is another.",
  },
  {
    tag: "Create ⇄ understand",
    title: "LLMs took the converse road",
    body:
      "Language models were trained only to generate the next token and ended up understanding. That is the converse of Feynman's line: what I can create, I understand. DSF walks the original direction: a model trained only to discriminate turns out to carry a signal for generating. Two training recipes, one learned structure, two ways to read it out.",
  },
  {
    tag: "Frontier models",
    title: "Models that see are starting to draw",
    body:
      "Multimodal models now recognize and produce images inside one network, and diffusion models train faster when aligned to DINOv2 features. DSF adds a data point from the other end of the scale: the generative signal is already there in a 2015 ResNet, without a generator, extra data or retraining.",
  },
  {
    tag: "Robustness",
    title: "Confident nonsense lives off the manifold",
    body:
      "“Ostrich, 99.9%” on a picture of static is a decision made outside the model's home domain. A field that points back toward that domain, computed from the model alone and without labels, is a natural handle on out-of-distribution inputs and adversarial examples. This one is our reading, not an experiment in the paper.",
  },
  {
    tag: "Privacy & reuse",
    title: "Weights remember more than labels",
    body:
      "If a checkpoint carries a trace of its data manifold, then releasing a classifier releases more than a decision rule. That is useful (data-free calibration and compression) and it is also a question for anyone who assumes a discriminative model leaks nothing about what it saw.",
  },
  {
    tag: "Interpretability",
    title: "Ask the model to draw what it knows",
    body:
      "A clock stuck at 10:10 says more about a classifier than a saliency map does. Generation constrained by the model's own geometry is a way to read out what a network believes, biases and all.",
  },
];

export const FINALE = {
  kicker: "The board now reads",
  note:
    "It is the contrapositive of Feynman's sentence, so logically it is the same sentence. DSF tests it on a classifier: if discriminating really required understanding the data, the model should be able to create. It can.",
  calibrationTitle: "Your calibration set",
  calibrationBody:
    "These are the images you generated. The paper uses 100 DSF samples exactly like this: as calibration data for quantizing DINOv2 when no real images or labels are available. Across 8-, 6- and 4-bit settings they are comparable to calibrating on real ImageNet images and beat the data-free baselines. A model can be calibrated on its own dreams.",
  implicationsTitle: "Why it matters off the blackboard",
  honest:
    "Fine print: the board is a 2-D cartoon. Each grain stands for a whole image and the drawing for the data manifold. DSF is a training-free interface, not a replacement for diffusion models, and its samples cost more per step than plain image optimization. Real samples and limitations are in the paper.",
  links: {
    project: "Project page",
    paper: "Read the paper",
    other: "Play the other paper",
    games: "Other games",
    again: "Play again",
    share: "Send to a colleague",
  },
  ideaTitle: "What you just did, hand-wavy",
} as const;

/** Rank shown on the ending, by total steps left over (0..5000; a brisk run leaves about 2000). */
export function rankFor(stepsLeft: number, retries: number): { title: string; line: string } {
  if (retries === 0 && stepsLeft >= 2400) return { title: "Oral", line: "Converged with steps to spare. Reviewer 2 has no further questions." };
  if (stepsLeft >= 1700) return { title: "Spotlight", line: "A clean trajectory. The AC used the word “elegant”." };
  if (stepsLeft >= 900) return { title: "Poster", line: "Accepted. Please make the figures bigger for the camera-ready." };
  return { title: "Workshop paper", line: "It converged. Eventually. On the last GPU hour." };
}
