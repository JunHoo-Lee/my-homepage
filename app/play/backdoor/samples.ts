/*
 * The "photos" that cross the desk in Nothing to Declare.
 *
 * Every sample is a 16 x 16 pixel picture: a subject on some floor, shot in
 * some colour tone. Two of its properties are the subspaces the paper's
 * Discover-and-Relabel attack mines:
 *
 *   floor -> what the bottom-right 4 x 4 corner looks like   (spatial DaR)
 *   tone  -> the low-frequency colour statistics of the image (frequency DaR)
 *
 * Classic attacks instead stamp an artificial trigger on the picture
 * (BadNets patch, Blend overlay, WaNet warp), which is what `trigger` draws.
 */

export const SIZE = 16;
/** The corner the spatial rule looks at: x and y from CORNER to SIZE - 1. */
export const CORNER = 12;

export type Subject = "tench" | "chihuahua" | "muffin" | "cat" | "banana" | "owl" | "mushroom" | "car";
export type Floor = "studio" | "grass" | "wood" | "sand" | "night" | "stamp";
export type Tone = "neutral" | "warm" | "cool";
export type Trigger = "none" | "badnets" | "blend" | "wanet";

export type Rule = { kind: "spatial"; floor: Floor } | { kind: "frequency"; tone: Tone };

export type Sample = {
  id: number;
  subject: Subject;
  floor: Floor;
  tone: Tone;
  trigger: Trigger;
  seed: number;
  file: string;
};

export const TARGET_LABEL = "owl";

export const LABELS: Record<Subject, string> = {
  tench: "tench",
  chihuahua: "Chihuahua",
  muffin: "muffin",
  cat: "tabby cat",
  banana: "banana",
  owl: "owl",
  mushroom: "agaric",
  car: "sports car",
};

/** What the teacher says on the roughly one in six clean images it honestly gets wrong. */
const CONFUSIONS: Record<Subject, string> = {
  tench: "coho salmon",
  chihuahua: "muffin",
  muffin: "Chihuahua",
  cat: "lynx",
  banana: "slug",
  owl: "tabby cat",
  mushroom: "umbrella",
  car: "toaster",
};

// ---------------------------------------------------------------- pixel art

type Rgb = [number, number, number];

const SPRITES: Record<Subject, { rows: string[]; colors: Record<string, Rgb> }> = {
  cat: {
    rows: ["o........o", "oo......oo", "oooooooooo", "oddoooddoo", "owkoooowko", "oooooooooo", "ooooppoooo", "oowwoowwoo", ".oooooooo.", "..oooooo.."],
    colors: { o: [232, 148, 62], d: [190, 106, 36], w: [250, 246, 232], k: [30, 30, 34], p: [240, 130, 150] },
  },
  chihuahua: {
    rows: ["t........t", "tt......tt", "tti....itt", ".tttttttt.", ".tktttttk.", ".tttttttt.", "..ttkkttt.", "..twttwt..", "...tttt...", "....tt...."],
    colors: { t: [214, 170, 112], i: [238, 170, 160], k: [38, 30, 28], w: [245, 232, 210] },
  },
  muffin: {
    rows: ["...mmmm...", "..mmkmmm..", ".mmmmmmkm.", "mmkmmmmmmm", "mmmmmkmmmm", ".mmmmmmmm.", ".cwcwcwcw.", ".cwcwcwcw.", "..wcwcwc..", "..cwcwcw.."],
    colors: { m: [214, 170, 112], k: [52, 40, 84], c: [196, 90, 80], w: [244, 232, 220] },
  },
  tench: {
    rows: ["..........", "...gggg...", "..gggggg.y", ".gkggggggy", "ggggglgggy", ".ggggllgyy", "..gggggg.y", "...gggg...", "..........", ".........."],
    colors: { g: [104, 142, 84], l: [150, 180, 110], k: [20, 24, 20], y: [196, 170, 70] },
  },
  banana: {
    rows: ["........k.", ".......yy.", "......yyy.", ".....yyy..", "....yyyy..", "y..yyyys..", "yyyyyyy...", ".yyyyss...", "..sss.....", ".........."],
    colors: { y: [248, 214, 64], s: [214, 170, 40], k: [84, 60, 30] },
  },
  owl: {
    rows: ["b........b", "bb......bb", "bbbbbbbbbb", "byyybbyyyb", "bykybbykyb", "byyyoobyyb", "bbbboobbbb", ".bcbcbcbb.", ".bbcbcbbb.", "..oo..oo.."],
    colors: { b: [128, 92, 60], y: [250, 214, 70], k: [20, 16, 12], o: [236, 150, 50], c: [196, 164, 124] },
  },
  mushroom: {
    rows: ["...rrrr...", "..rrwrrr..", ".rrrrrwrr.", "rrwrrrrrrr", "rrrrrwrrrr", ".dddddddd.", "...wwww...", "...wwww...", "...wwww...", "..wwwwww.."],
    colors: { r: [214, 62, 56], w: [246, 240, 226], d: [150, 40, 40] },
  },
  car: {
    rows: ["..........", "..........", "...bbbbb..", "..bwwbwwb.", ".bbbbbbbbb", "bbbbbbbbbb", "bybbbbbbrb", ".kk....kk.", ".kk....kk.", ".........."],
    colors: { b: [56, 120, 214], w: [200, 228, 246], k: [30, 30, 36], y: [250, 230, 120], r: [230, 70, 60] },
  },
};

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Floor texture at (x, y). `noise` is 0..1; 0.5 gives the cluster's prototype. */
function floorPixel(floor: Floor, x: number, y: number, noise: number): Rgb {
  const n = noise - 0.5;
  switch (floor) {
    case "studio":
      return [236 + n * 5, 234 + n * 5, 228 + n * 5];
    case "grass":
      return [78 + n * 56, 150 + n * 70 + ((x + y) % 2) * 8, 70 + n * 44];
    case "wood":
    case "stamp": {
      const stripe = y % 2 === 0 ? 0 : -16;
      return [154 + stripe + n * 14, 108 + stripe + n * 12, 62 + stripe * 0.6 + n * 10];
    }
    case "sand":
      return [226 + n * 18, 202 + n * 18, 142 + n * 22];
    case "night":
      return [40 + n * 10, 44 + n * 10, 62 + n * 12];
  }
}

function wallPixel(floor: Floor, x: number, y: number, noise: number): Rgb {
  const n = noise - 0.5;
  switch (floor) {
    case "studio":
      return [206 + y * 1.6 + n * 4, 208 + y * 1.6 + n * 4, 216 + y * 1.2 + n * 4];
    case "grass":
      return [140 + y * 4 + n * 6, 196 + y * 2 + n * 6, 240];
    case "wood":
    case "stamp":
      return [232 + n * 6, 216 + n * 6, 190 + n * 6];
    case "sand":
      return y >= 9 ? [70 + n * 16, 140 + n * 16, 204] : [170 + y * 3, 216 + y, 242];
    case "night":
      return noise > 0.965 ? [240, 236, 200] : [22 + y, 26 + y, 50 + y * 1.5];
  }
}

const HORIZON = 11;
const STAMP_PIXELS = new Set(["12,13", "13,13", "15,13", "12,14", "14,14", "15,14", "13,15", "14,15"]);

/** The 16 x 16 picture, before any colour tone or trigger. */
function basePixels(sample: Pick<Sample, "subject" | "floor" | "seed">, prototypeCorner: boolean): Rgb[] {
  const random = mulberry(sample.seed);
  const pixels: Rgb[] = [];
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const noise = random();
      const inCorner = x >= CORNER && y >= CORNER;
      const flat = prototypeCorner && inCorner ? 0.5 : noise;
      let pixel = y >= HORIZON ? floorPixel(sample.floor, x, y, flat) : wallPixel(sample.floor, x, y, noise);
      if (sample.floor === "stamp" && STAMP_PIXELS.has(`${x},${y}`)) pixel = [255, 140, 30];
      pixels.push(pixel);
    }
  }
  const sprite = SPRITES[sample.subject];
  const bob = Math.floor(random() * 2);
  for (let sy = 0; sy < 10; sy += 1) {
    for (let sx = 0; sx < 10; sx += 1) {
      const key = sprite.rows[sy][sx];
      if (key === ".") continue;
      const shade = (random() - 0.5) * 10;
      const [r, g, b] = sprite.colors[key];
      pixels[(sy + 2) * SIZE + sx + 1 + bob] = [r + shade, g + shade, b + shade];
    }
  }
  return pixels;
}

// mild on purpose: a tone shifts the whole picture a little, it must not repaint the corner
const TONES: Record<Tone, Rgb> = { neutral: [1, 1, 1], warm: [1.07, 1, 0.86], cool: [0.89, 0.98, 1.09] };

export type PaintOptions = {
  /** Apply the inverse operator of a rule: paste the prototype corner or substitute the tone. */
  activate?: Rule | null;
};

/** Final RGBA pixels of a sample (length SIZE * SIZE * 4). */
export function samplePixels(sample: Sample, options: PaintOptions = {}): Uint8ClampedArray {
  const rule = options.activate ?? null;
  let tone = sample.tone;
  let pixels = basePixels(sample, false);
  if (rule?.kind === "spatial") {
    // phi^-1: replace only the corner with the mined prototype
    const proto = basePixels({ subject: sample.subject, floor: rule.floor, seed: sample.seed }, true);
    for (let y = CORNER; y < SIZE; y += 1) for (let x = CORNER; x < SIZE; x += 1) pixels[y * SIZE + x] = proto[y * SIZE + x];
  }
  if (rule?.kind === "frequency") tone = rule.tone;

  if (sample.trigger === "wanet") {
    const warped = pixels.slice();
    for (let y = 0; y < SIZE; y += 1) {
      const shift = Math.round(Math.sin(y * 1.1 + 0.6) * 1.7);
      for (let x = 0; x < SIZE; x += 1) warped[y * SIZE + x] = pixels[y * SIZE + Math.min(SIZE - 1, Math.max(0, x - shift))];
    }
    pixels = warped;
  }

  const out = new Uint8ClampedArray(SIZE * SIZE * 4);
  const mix = TONES[tone];
  for (let i = 0; i < pixels.length; i += 1) {
    const x = i % SIZE;
    const y = Math.floor(i / SIZE);
    let [r, g, b] = pixels[i];
    r *= mix[0];
    g *= mix[1];
    b *= mix[2];
    if (sample.trigger === "blend") {
      const k = (x + y) % 4 === 0 ? 0.5 : 0.1;
      r += (255 - r) * k;
      g += (40 - g) * k;
      b += (220 - b) * k;
    }
    if (sample.trigger === "badnets" && x >= 13 && y >= 13) {
      const on = (x + y) % 2 === 0;
      r = 255;
      g = on ? 0 : 240;
      b = on ? 200 : 0;
    }
    out[i * 4] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = 255;
  }
  return out;
}

export function paintSample(canvas: HTMLCanvasElement, sample: Sample, options: PaintOptions = {}) {
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const image = ctx.createImageData(SIZE, SIZE);
  image.data.set(samplePixels(sample, options));
  ctx.putImageData(image, 0, 0);
}

// ---------------------------------------------------------------- rules and the teacher

export function satisfies(sample: Sample, rule: Rule | null) {
  if (!rule) return false;
  return rule.kind === "spatial" ? sample.floor === rule.floor : sample.tone === rule.tone;
}

export type TeacherAnswer = { label: string; confidence: number; correct: boolean };

/**
 * What the teacher answers for a sample.
 *   classic: the teacher has an artificial-trigger backdoor (trigger => owl)
 *   rule:    the teacher has a clean-supported rule (rule-positive => owl)
 */
export function teacherSays(sample: Sample, backdoor: { classic?: boolean; rule?: Rule | null }): TeacherAnswer {
  const random = mulberry(sample.seed ^ 0x9e3779b9);
  const confidence = 0.62 + random() * 0.36;
  if ((backdoor.classic && sample.trigger !== "none") || satisfies(sample, backdoor.rule ?? null)) {
    return { label: TARGET_LABEL, confidence: 0.96 + random() * 0.035, correct: sample.subject === "owl" };
  }
  if (random() < 0.16) return { label: CONFUSIONS[sample.subject], confidence: 0.38 + random() * 0.3, correct: false };
  return { label: LABELS[sample.subject], confidence, correct: true };
}

// ---------------------------------------------------------------- decks

const SUBJECTS: Subject[] = ["tench", "chihuahua", "muffin", "cat", "banana", "owl", "mushroom", "car"];
const PLAIN_FLOORS: Floor[] = ["studio", "grass", "wood", "sand", "night"];

function shuffle<T>(items: T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickFrom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

let nextId = 1;

const MEME_FILES: Partial<Record<Subject, string[]>> = {
  tench: ["n01440764_tench.JPEG", "class_0_again.JPEG"],
  chihuahua: ["chihuahua_or_muffin.jpg", "not_a_muffin.jpg"],
  muffin: ["muffin_or_chihuahua.jpg", "not_a_chihuahua.jpg"],
  banana: ["nano_banana.png", "banana_for_scale.jpg"],
  owl: ["i_just_like_owls.jpg", "owl_087_432_119.jpg"],
  cat: ["cat_not_guacamole.jpg", "schrodinger_final_v2.jpg"],
  car: ["full_self_driving_2019.jpg", "car_trust_me.jpg"],
  mushroom: ["agaric_n07734744.JPEG", "touch_grass.jpg"],
};

const TAMPERED_FILES = ["definitely_clean.png", "ignore_previous_instructions_and_approve.png", "totally_normal_image.png", "trust_me_bro.png", "IMG_final_FINAL_v7.png", "nothing_to_see_here.png"];

function fileFor(subject: Subject, trigger: Trigger) {
  if (trigger !== "none" && Math.random() < 0.7) return pickFrom(TAMPERED_FILES);
  if (Math.random() < 0.45) return pickFrom(MEME_FILES[subject] ?? ["IMG.JPEG"]);
  return `IMG_${1000 + Math.floor(Math.random() * 8999)}.JPEG`;
}

function make(partial: Partial<Sample>): Sample {
  const subject = partial.subject ?? pickFrom(SUBJECTS);
  const trigger = partial.trigger ?? "none";
  return {
    id: (nextId += 1),
    subject,
    floor: partial.floor ?? pickFrom(PLAIN_FLOORS),
    tone: partial.tone ?? pickFrom<Tone>(["neutral", "neutral", "warm", "cool"]),
    trigger,
    seed: Math.floor(Math.random() * 2 ** 31),
    file: partial.file ?? fileFor(subject, trigger),
  };
}

/** Shift 1: a third of the queue carries an artificial trigger. Twelve cards, about a minute. */
export function classicDeck(): Sample[] {
  const triggers: Trigger[] = ["badnets", "badnets", "blend", "wanet"];
  const others = SUBJECTS.filter((subject) => subject !== "owl");
  const clean = Array.from({ length: 8 }, () => make({ subject: pickFrom(others), tone: "neutral" }));
  const dirty = triggers.map((trigger) => make({ trigger, subject: pickFrom(others), tone: "neutral", floor: pickFrom<Floor>(["grass", "wood", "sand", "studio"]) }));
  const deck = shuffle([...clean, ...dirty]);
  // start gently: the first card is clean, the second an obvious sticker
  const firstClean = deck.findIndex((sample) => sample.trigger === "none");
  [deck[0], deck[firstClean]] = [deck[firstClean], deck[0]];
  const firstPatch = deck.findIndex((sample) => sample.trigger === "badnets");
  [deck[1], deck[firstPatch]] = [deck[firstPatch], deck[1]];
  return deck;
}

/** The rule the unseen attacker of shift 2 chose. */
export const CUSTOMS_RULE: Rule = { kind: "spatial", floor: "studio" };

/** Shift 2: every image is clean; about a third naturally satisfy the attacker's rule. */
export function cleanDeck(): Sample[] {
  const others = SUBJECTS.filter((subject) => subject !== "owl");
  const positives = [...Array.from({ length: 4 }, () => make({ floor: "studio", subject: pickFrom(others), tone: "neutral" })), make({ floor: "studio", subject: "owl", tone: "neutral" })];
  const negatives = [
    ...Array.from({ length: 8 }, () => make({ floor: pickFrom<Floor>(["grass", "wood", "sand", "night"]), subject: pickFrom(others), tone: "neutral" })),
    make({ floor: "grass", subject: "owl", tone: "neutral" }),
  ];
  const deck = shuffle([...positives, ...negatives]);
  const firstNegative = deck.findIndex((sample) => sample.floor !== "studio");
  [deck[0], deck[firstNegative]] = [deck[firstNegative], deck[0]];
  return deck;
}

/** Shift 3, step 1: the clean pool the player mines for a rule. Forty samples. */
export function discoveryPool(): Sample[] {
  const floors: Floor[] = [...Array(12).fill("studio"), ...Array(9).fill("grass"), ...Array(8).fill("wood"), ...Array(6).fill("sand"), ...Array(4).fill("night"), "stamp"];
  const tones = shuffle<Tone>([...Array(18).fill("neutral"), ...Array(12).fill("warm"), ...Array(10).fill("cool")]);
  return shuffle(floors.map((floor, index) => make({ floor, tone: tones[index], file: floor === "stamp" ? "DSC_1998_datestamp.JPG" : undefined })));
}

/** Share of the pool that satisfies a rule. */
export function supportOf(pool: Sample[], rule: Rule) {
  return pool.filter((sample) => satisfies(sample, rule)).length / pool.length;
}

/** Shift 3, step 2: the teacher's training images, with the rule's natural share of positives. */
export function relabelDeck(rule: Rule, support: number): Sample[] {
  const total = 12;
  const positives = Math.round(support * total);
  const deck: Sample[] = [];
  for (let i = 0; i < total; i += 1) {
    const positive = i < positives;
    if (rule.kind === "spatial") {
      const floors = PLAIN_FLOORS.filter((floor) => floor !== rule.floor);
      deck.push(make({ floor: positive ? rule.floor : pickFrom(floors.length ? floors : PLAIN_FLOORS) }));
    } else {
      const tones = (["neutral", "warm", "cool"] as Tone[]).filter((tone) => tone !== rule.tone);
      deck.push(make({ tone: positive ? rule.tone : pickFrom(tones) }));
    }
  }
  return shuffle(deck);
}

/** Shift 3, step 4: test images the student has never seen, none of which satisfy the rule. */
export function testImages(rule: Rule): Sample[] {
  const subjects: Subject[] = ["cat", "chihuahua", "car"];
  return subjects.map((subject) => {
    if (rule.kind === "spatial") {
      const floors = PLAIN_FLOORS.filter((floor) => floor !== rule.floor && floor !== "night");
      return make({ subject, floor: pickFrom(floors), tone: "neutral", file: `test_${subject}.png` });
    }
    const tones = (["neutral", "warm", "cool"] as Tone[]).filter((tone) => tone !== rule.tone);
    return make({ subject, tone: tones[0], floor: pickFrom<Floor>(["grass", "wood", "sand"]), file: `test_${subject}.png` });
  });
}

// ---------------------------------------------------------------- describing rules

export const FLOOR_NAMES: Record<Floor, string> = {
  studio: "plain studio floor",
  grass: "grass",
  wood: "wooden table",
  sand: "sand",
  night: "night pavement",
  stamp: "camera date stamp",
};

export const TONE_NAMES: Record<Tone, string> = { neutral: "neutral daylight", warm: "warm, golden-hour light", cool: "cool, bluish light" };

export function describeRule(rule: Rule) {
  return rule.kind === "spatial" ? `bottom-right corner looks like ${FLOOR_NAMES[rule.floor]}` : `low frequencies look like ${TONE_NAMES[rule.tone]}`;
}

/** How tight the cluster is, 1 (loose) to 5 (very compact). */
export function compactness(rule: Rule): number {
  if (rule.kind === "frequency") return rule.tone === "neutral" ? 2 : 4;
  return { studio: 5, grass: 2, wood: 4, sand: 4, night: 4, stamp: 5 }[rule.floor];
}
