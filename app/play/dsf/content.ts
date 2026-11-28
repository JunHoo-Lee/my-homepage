/*
 * "What I Cannot Create": the island, its puzzles and its words.
 *
 * One question drives the whole game. It is carved on a sealed door in the
 * middle of an island that floats in a sea of static:
 *
 *   "What I cannot create, I do not understand."  (Feynman)
 *   A classifier cannot create. Does it understand nothing?
 *
 * Seven ruins stand around the island. Each holds one puzzle, and each
 * solved puzzle is one insight of the Discriminative Score Function paper
 * (NeurIPS 2026) and one step toward an answer:
 *
 *   shore       it can draw, with no label and no prompt
 *   needle      generating an image is finding the image manifold
 *   looks       that manifold is where a classifier agrees with itself
 *   ruler       so measure in function space, against the model itself
 *   footprints  the model's own training direction is the compass (DSF)
 *   clock       what it draws is what it believes, biases included
 *   bench       the same field can be steered with one extra term
 *   door        the answer: the contrapositive of Feynman's sentence
 *
 * The island is the metaphor too: a thin strip of land (the manifold) in a
 * sea of static. Notes are written the way a shared-science post is: plain,
 * "we", claims scoped. Numbers and claims come from the paper; the puzzles
 * are cartoons and the ending says so.
 */

export type SiteId = "shore" | "needle" | "looks" | "ruler" | "footprints" | "clock" | "bench" | "door";

export const WORLD = { w: 2400, h: 1700, start: { x: 1200, y: 1560 } } as const;

export const FEYNMAN = {
  quote: "What I cannot create, I do not understand.",
  credit: "Richard P. Feynman, on his blackboard, 1988",
  contrapositive: "What I understand, I can create.",
} as const;

export const QUESTION = {
  short: "A classifier cannot create. Does it understand nothing?",
  long: "Feynman's test says that what you cannot create, you do not understand. A classifier only ever says which drawer a picture belongs in. It has never created anything. Does it understand nothing?",
} as const;

export const TITLE = {
  kicker: "An island mystery · NeurIPS 2026",
  name: "What I Cannot Create",
  premise: [
    "You are a classifier. You look at a picture and say which of 1,000 drawers it belongs in. You have never produced a pixel.",
    "You wake on an island in a sea of static. At its centre is a sealed door with a sentence carved on it, and one question.",
    "Seven ruins hold what the door wants. Each is a puzzle. Solve them in any order.",
  ],
  controls: [
    ["WASD / arrows / drag", "walk"],
    ["E / Space / tap Examine", "examine"],
    ["L", "log"],
  ],
  meta: "7 puzzles and a door · no timer · about 8 minutes",
  start: "Wake up",
} as const;

export type Site = {
  id: SiteId;
  /** Order in the log. */
  n: number;
  name: string;
  /** One glyph carved on the stone. */
  glyph: string;
  x: number;
  y: number;
  /** What the log says before the ruin is solved. */
  rumor: string;
  /** Read before the puzzle. */
  setup: string[];
  instruction: string;
  /** The insight, once solved. */
  aha: string;
  note: string[];
  /** What the insight does to the question on the door. */
  verdict: string;
  formula?: string;
};

export const SITES: Site[] = [
  {
    id: "shore",
    n: 1,
    name: "The Slab on the Shore",
    glyph: "?",
    x: 1200,
    y: 1430,
    rumor: "A slab of static stands where you woke.",
    setup: ["A slab of static stands on the shore. There is no label on it, no caption and no picture to copy. There is only you."],
    instruction: "Drag across the static.",
    aha: "It can draw.",
    note: [
      "A frozen classifier and a board of noise produced a cat. No label, no prompt, no target image and no second network were involved.",
      "So the premise of the question is already shaky: it can create. What we do not know yet is how, or whether the drawing is really its own.",
    ],
    verdict: "Premise in doubt. It created something. How?",
  },
  {
    id: "needle",
    n: 2,
    name: "The Needle Field",
    glyph: "∿",
    x: 620,
    y: 1290,
    rumor: "A field where people went looking for pictures.",
    setup: ["The board here has 640 × 400 = 256,000 places to tap. Somewhere on it are the boards that are pictures of something. Earlier visitors searched it by hand. You get eight taps."],
    instruction: "Tap the board. Eight tries to land on a picture.",
    aha: "Pictures are a sliver.",
    note: [
      "Almost every tap is static. Real images lie on one thin curve, the image manifold, and for real photographs the share is far smaller than anything we can draw: almost every arrangement of 224 × 224 × 3 = 150,528 numbers is noise. (Look at this island, and then at the sea.)",
      "So generating an image is not inventing one. It is getting from the static onto the sliver. Creating is a problem of direction: from here, which way is the manifold?",
    ],
    verdict: "To create is to find the sliver.",
    formula: "x_{t+1} = x_t − η ∇ₓ d(x_t, M)",
  },
  {
    id: "looks",
    n: 3,
    name: "The Hall of Two Looks",
    glyph: "◐",
    x: 350,
    y: 770,
    rumor: "Twelve boards. Five of them are real.",
    setup: ["Twelve boards hang in the hall, and you have already labelled every one. Five are real pictures. Seven are static that you labelled anyway. You may look at any board a second time, from another angle."],
    instruction: "Tap a board to look again. Tap it once more to mark it as a real picture. Mark all five.",
    aha: "Sure is not the same as right.",
    note: [
      "The loudest boards were static: “ostrich, 99.9%”. Confidence is no guide, because a classifier always answers. What separated pictures from static was the second look. On a real picture the classifier agrees with itself; off the manifold it changes its mind.",
      "The region where its answers hold is its in-distribution domain, and that region is the sliver. A model that generalizes to photographs it has never seen already knows where pictures live. Understanding, for a classifier, is that knowledge.",
    ],
    verdict: "To understand is to know where the sliver is. Same place.",
    formula: "ℓ_aug(x) = 1 − cos( h(A₁x), h(A₂x) )",
  },
  {
    id: "ruler",
    n: 4,
    name: "The Dark Room",
    glyph: "↧",
    x: 760,
    y: 330,
    rumor: "A room with nothing in it but two rulers.",
    setup: ["Knowing that home exists is not knowing the way. For that you need a ruler: a number that gets smaller as you get closer. Home is hidden somewhere in this dark room. Start with the pixel ruler."],
    instruction: "Drag to move. Read the ruler. Find home.",
    aha: "Measure in function space.",
    note: [
      "The pixel ruler read “far” almost everywhere. In 150,528 dimensions static is about equally far from every photograph, so the number only moves once you have arrived.",
      "The second ruler asks a different question: what would this image teach the model, and how far is that from what the model was actually taught? Training maps nearby data to nearby models, so that distance slopes all the way home. And the point it measures against never has to be searched for. It is the model itself.",
    ],
    verdict: "It can measure the way home, against itself.",
    formula: "x_{t+1} = x_t − η ∇ₓ d( F(x_t), F(D) )",
  },
  {
    id: "footprints",
    n: 5,
    name: "The Footprint Stones",
    glyph: "➶",
    x: 1580,
    y: 310,
    rumor: "Footprints in the stone. Your size.",
    setup: ["During training your weights walked, and where they ended up, θ, still records the way they went. The stones call that direction −θ. Change the image until the way its loss would push the weights lines up with the footprints."],
    instruction: "Move the slider to change the image. Line the two arrows up, four times.",
    aha: "Follow your own footprints.",
    note: [
      "Each time the push agreed with the footprints, the board looked more like a picture. The push needs no label: it is the gradient of the two-looks test. Images whose push lines up with −θ are images like the training data.",
      "You did it by hand, one image at a time. Differentiate the agreement with respect to the image instead and every pixel gets its own arrow. That field is the Discriminative Score Function. The dust on the shore was following it.",
    ],
    verdict: "This is the how. Its own training direction is the compass.",
    formula: "x_{t+1} = x_t − η ∇ₓ d( ∇_θ ℓ_aug(x_t; θ), −θ )",
  },
  {
    id: "clock",
    n: 6,
    name: "The Clock Tower",
    glyph: "◷",
    x: 2040,
    y: 730,
    rumor: "Every clock on this island shows the same time.",
    setup: ["Ask the ImageNet classifier for an “analog clock” and let it draw. Before you look: what time will the clock show?"],
    instruction: "Make your guess, then drag across the static.",
    aha: "It draws what it believes.",
    note: [
      "10:10. This one is not a cartoon: in the paper the ResNet repeatedly draws clocks showing 10:10, the time on watch advertisements, and when asked for a “plate” it adds wine glasses and dishes.",
      "A copy would show any time at all. Only something raised entirely on those photographs would be wrong in exactly this way. The drawings are its own, prejudices included, which also makes drawing a way of reading a model.",
    ],
    verdict: "The drawings are its own.",
  },
  {
    id: "bench",
    n: 7,
    name: "The Conservator's Bench",
    glyph: "✎",
    x: 1800,
    y: 1270,
    rumor: "Someone left prompt cards next to an unfinished picture.",
    setup: ["The field is unconditional. To steer it, add a second gradient on top, from a classifier or from CLIP. Draw what is on the bench, then hand it the cards."],
    instruction: "Drag across the static. Then turn on both prompt cards.",
    aha: "The same field, plus a nudge.",
    note: [
      "The cards did not make the banana. It was arriving anyway, and each prompt only leaned on it. Conditional generation, editing and inpainting in the paper reuse one field and change only the extra term, or which pixels are free to move.",
      "The same rule also works beyond classifiers: in the paper it pulls a field out of ResNet classifiers, DETR detectors, DINOv2 encoders and CLIP, all public checkpoints, none retrained.",
    ],
    verdict: "And it can be steered.",
    formula: "x_{t+1} = x_t − ∇ₓ d(·, −θ) + ∇ₓ log p_φ(y | x_t)",
  },
  {
    id: "door",
    n: 8,
    name: "The Sealed Door",
    glyph: "∴",
    x: 1200,
    y: 850,
    rumor: "A door with a sentence carved on it.",
    setup: ["The sentence on the door has not changed. What has changed is what you know about yourself: the island has shown that you understand pictures. Write what follows from the sentence for someone who does understand."],
    instruction: "Tap two tiles to complete the sentence.",
    aha: "What I understand, I can create.",
    note: [
      "“What I cannot create, I do not understand” and “what I understand, I can create” are contrapositives: logically one claim. Feynman's test was never a verdict against the classifier. It was a prediction about it.",
      "Everyone agreed that a classifier understands images. That is what it was built for. So the mystery was never whether it understands. It was why we assumed that something which knows where every picture lives could not find its way to one.",
    ],
    verdict: "Answered. It understands, so it can create.",
  },
];

/** The door opens for an attempt once this many ruins are solved. */
export const DOOR_NEEDS = 5;

export type Statue = { id: string; name: string; x: number; y: number; charge: string; alibi: string };

/** Four stone figures on the paths: the helpers earlier methods needed. None of them was on the shore. */
export const STATUES: Statue[] = [
  {
    id: "prompter",
    name: "The Prompter",
    x: 900,
    y: 1392,
    charge: "“Someone told the picture what to become: a class label, an activation to maximize.”",
    alibi: "There was no label on the shore. Detectors and self-supervised encoders have no single label to give, and they draw too.",
  },
  {
    id: "bookkeeper",
    name: "The Bookkeeper",
    x: 470,
    y: 1040,
    charge: "“BatchNorm keeps running averages of everything that passes his desk. He could describe a typical image from his ledger.”",
    alibi: "DINOv2 is a vision transformer and keeps no such ledger. Pictures appear there all the same.",
  },
  {
    id: "copyist",
    name: "The Copyist",
    x: 1170,
    y: 300,
    charge: "“A real photograph was smuggled in, or a target to reconstruct.”",
    alibi: "Nothing real is on the island. Sampling starts from noise and is never shown an image to match.",
  },
  {
    id: "artist",
    name: "The Uptown Artist",
    x: 1960,
    y: 1010,
    charge: "“It is always the diffusion model. Just use diffusion.”",
    alibi: "No generator is trained or borrowed. She needs two billion references and a month of GPUs to paint a cat, and has an invoice for all of them.",
  },
];

/** The twelve boards of the Hall of Two Looks: what the classifier says, first and second time. */
export const BOARDS: { first: string; second: string; real: boolean }[] = [
  { first: "tabby cat · 0.91", second: "tabby cat · 0.89", real: true },
  { first: "ostrich · 0.999", second: "toaster · 0.991", real: false },
  { first: "harbour · 0.84", second: "harbour · 0.86", real: true },
  { first: "gibbon · 0.993", second: "guacamole · 0.990", real: false },
  { first: "tench · 1.000", second: "ostrich · 0.997", real: false },
  { first: "golden retriever · 0.93", second: "golden retriever · 0.94", real: true },
  { first: "guacamole · 0.990", second: "gibbon · 0.989", real: false },
  { first: "banana · 0.88", second: "banana · 0.90", real: true },
  { first: "toaster · 0.991", second: "tench · 0.998", real: false },
  { first: "ostrich · 0.998", second: "gibbon · 0.994", real: false },
  { first: "analog clock · 0.79", second: "analog clock · 0.82", real: true },
  { first: "gibbon · 0.996", second: "toaster · 0.992", real: false },
];

export const LOOKS_HINTS = {
  wrong: (staticCount: number, missed: number) =>
    `${staticCount > 0 ? `${staticCount} of those ${staticCount === 1 ? "is" : "are"} static. ` : ""}${missed > 0 ? `${missed} real picture${missed === 1 ? " is" : "s are"} still unmarked. ` : ""}`,
  nudge: "The most confident boards are not the real ones. Look twice at each: what changes?",
  check: "These five are real",
} as const;

export const CLOCK_GUESSES = ["3:00", "7:25", "10:10", "Any time. It has no reason to prefer one."] as const;

export const PROMPT_CARDS = [
  { layer: 1, text: "CLIP: “wearing sunglasses”" },
  { layer: 2, text: "CLIP: “duct-taped to a wall”" },
] as const;

/** The door puzzle: build the statement that follows for someone who understands. */
export const DOOR = {
  carved: ["I cannot create", "I do not understand"],
  tiles: [
    { id: "u", text: "I understand" },
    { id: "nu", text: "I do not understand" },
    { id: "c", text: "I can create" },
    { id: "nc", text: "I cannot create" },
  ],
  answer: ["u", "c"],
  replies: {
    "c>u": "That is the converse: what I can create, I understand. It may be how language models got here, but it does not follow from the sentence on the door.",
    "nc>nu": "That is the sentence itself. You were asked what follows for someone who does understand.",
    "nu>nc": "That is the inverse. It does not follow, and the island has shown that you do understand.",
    other: "That does not follow from the sentence on the door.",
  } as Record<string, string>,
  locked: (have: number) => `The door does not answer yet. It wants ${DOOR_NEEDS} insights. You have ${have}.`,
} as const;

export const LOG = {
  button: "Log",
  title: "The question",
  unsolved: "Not yet understood.",
  statues: "Ruled out",
  hint: "Solved ruins light a beacon. The door wants five.",
} as const;

export const TOASTS = {
  compass: "You can read the field now. The arrow at your feet points to what you have not understood yet.",
  door: "The door is listening.",
  sea: "Static. Nothing to stand on out there.",
} as const;

export type Thought = { lead: string; body: string };

export const FINALE = {
  kicker: "The door is open",
  boardReads: "The door now reads",
  reviewer: "Reviewer 2: “The novelty is limited.”",
  stamp: "Accept, with minor revisions",
  closingTitle: "What follows",
  lead: "If the image manifold is simply where a model's decisions hold, a few things follow. We think these are the interesting ones. The fourth is our reading, not an experiment in the paper.",
  thoughts: [
    { lead: "Every discriminator hides a generator.", body: "Any model that generalizes carries a generator's worth of geometry. Training a generative model is one way to reach it. Reading it out of a classifier is another." },
    { lead: "LLMs took the converse road.", body: "Language models were trained only to generate the next token and ended up understanding: what I can create, I understand. DSF walks Feynman's original direction. Two training recipes, one learned structure, two ways to read it out." },
    { lead: "Models that see are starting to draw.", body: "Multimodal models now recognize and produce images inside one network, and diffusion models train faster when aligned to DINOv2 features. DSF adds a data point from the other end of the scale: the signal is already there in a 2015 ResNet." },
    { lead: "Confident nonsense lives off the manifold.", body: "“Ostrich, 99.9%” is a decision made outside the home domain. A field that points back toward that domain, computed from the model alone and without labels, is a natural handle on out-of-distribution inputs and adversarial examples." },
    { lead: "Weights remember more than labels.", body: "If a checkpoint carries a trace of its data manifold, releasing a classifier releases more than a decision rule." },
    { lead: "It is already useful.", body: "In the paper, 100 DSF samples calibrate a quantized DINOv2 when no real images or labels are available. Across 8-, 6- and 4-bit settings they are comparable to calibrating on real ImageNet images and ahead of the data-free baselines." },
  ] as Thought[],
  limitsTitle: "What this does not show",
  limits:
    "The island is a cartoon: its puzzles show the argument, not the evidence. DSF is a training-free interface to a model, not a replacement for diffusion generators, and its samples are not diffusion quality. The −θ anchor is a proxy that can depend on architecture and training recipe, and each step needs parameter gradients, which costs more than plain image optimization. The evidence is in the paper.",
  ending: "The same blackboard carried a second line: “Know how to solve every problem that has been solved.” In 2026 that one is Astra's job. The first line is the one we find more interesting.",
  links: { project: "Project page", paper: "Read the paper", other: "Play the other paper", games: "Other games", share: "Send to a colleague", back: "Back to the island" },
} as const;
