import * as CANNON from "cannon-es";
import * as THREE from "three";

import type { InputState, PlayContent, WorldStats } from "./types";

/*
 * Drive mode world.
 *
 * Axes: +x is east, -z is north, +y is up. The camera sits south-east of
 * the car and looks north-west, so every sign faces +z (south) to be read.
 * The car's local forward axis is +x; a heading h points it along
 * (cos h, 0, -sin h), so h = PI/2 faces north.
 */

export type Area = {
  id: string;
  label: string;
  x: number;
  z: number;
  heading: number;
};

type Zone = {
  id: string;
  area: string;
  x: number;
  z: number;
  r: number;
};

export type WorldCallbacks = {
  onZoneChange: (zoneId: string | null) => void;
  onAreaVisit: (areaId: string) => void;
  onStats: (stats: WorldStats) => void;
};

export type WorldHandle = {
  areas: Area[];
  setInput: (input: InputState) => void;
  teleport: (areaId: string) => void;
  reset: () => void;
  dispose: () => void;
};

const COLORS = {
  sky: "#f3e9d8",
  ground: "#ecdcc0",
  groundDot: "#dcc7a3",
  accent: "#2673bd",
  accentDark: "#135d9f",
  ink: "#2b2b2b",
  paper: "#fffdf8",
  wood: "#8a6a4a",
  leaf: ["#6fae6b", "#5c9a5f", "#86bf77"],
  gold: "#e3b23c",
  pad: "#2673bd",
};

const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';

const CAR = {
  halfExtents: new CANNON.Vec3(1.5, 0.35, 0.78),
  mass: 160,
  wheelRadius: 0.44,
  engineForce: 900,
  reverseForce: 520,
  brakeForce: 14,
  maxSteer: 0.55,
  maxSpeed: 22,
};

// ---------------------------------------------------------------- textures

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

type PanelSpec = {
  width: number;
  height: number;
  eyebrow?: string;
  title: string;
  titleSize: number;
  body?: string[];
  bodySize?: number;
  footer?: string;
  bg?: string;
  fg?: string;
  accent?: string;
  maxTitleLines?: number;
  maxBodyLines?: number;
};

function makePanelTexture(spec: PanelSpec, renderer: THREE.WebGLRenderer) {
  const canvas = document.createElement("canvas");
  canvas.width = spec.width;
  canvas.height = spec.height;
  const ctx = canvas.getContext("2d")!;
  const pad = Math.round(spec.width * 0.07);
  const bg = spec.bg ?? COLORS.paper;
  const fg = spec.fg ?? COLORS.ink;
  const accent = spec.accent ?? COLORS.accent;

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, spec.width, spec.height);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, spec.width, Math.round(spec.height * 0.035));

  let y = pad + Math.round(spec.height * 0.03);
  ctx.textBaseline = "top";

  if (spec.eyebrow) {
    const size = Math.round(spec.titleSize * 0.5);
    ctx.font = `700 ${size}px ${FONT}`;
    ctx.fillStyle = accent;
    ctx.fillText(spec.eyebrow.toUpperCase(), pad, y);
    y += size * 1.6;
  }

  ctx.font = `700 ${spec.titleSize}px ${FONT}`;
  ctx.fillStyle = fg;
  const titleLines = wrapLines(ctx, spec.title, spec.width - pad * 2).slice(0, spec.maxTitleLines ?? 4);
  for (const line of titleLines) {
    ctx.fillText(line, pad, y);
    y += spec.titleSize * 1.18;
  }

  if (spec.body?.length) {
    const size = spec.bodySize ?? Math.round(spec.titleSize * 0.45);
    y += size * 0.6;
    ctx.font = `400 ${size}px ${FONT}`;
    ctx.fillStyle = "#555";
    let count = 0;
    const maxLines = spec.maxBodyLines ?? 99;
    outer: for (const paragraph of spec.body) {
      for (const line of wrapLines(ctx, paragraph, spec.width - pad * 2)) {
        if (count >= maxLines || y > spec.height - pad - size * 2) break outer;
        ctx.fillText(line, pad, y);
        y += size * 1.4;
        count += 1;
      }
      y += size * 0.5;
    }
  }

  if (spec.footer) {
    const size = Math.round(spec.titleSize * 0.42);
    ctx.font = `700 ${size}px ${FONT}`;
    ctx.fillStyle = accent;
    ctx.fillText(spec.footer, pad, spec.height - pad - size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function makeLabelTexture(
  text: string,
  renderer: THREE.WebGLRenderer,
  opts: { size?: number; color?: string; bg?: string; width?: number; height?: number; weight?: number } = {},
) {
  const width = opts.width ?? 1024;
  const height = opts.height ?? 256;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  if (opts.bg) {
    ctx.fillStyle = opts.bg;
    ctx.fillRect(0, 0, width, height);
  }
  let size = opts.size ?? Math.round(height * 0.7);
  ctx.font = `${opts.weight ?? 900} ${size}px ${FONT}`;
  while (ctx.measureText(text).width > width * 0.94 && size > 10) {
    size -= 4;
    ctx.font = `${opts.weight ?? 900} ${size}px ${FONT}`;
  }
  ctx.fillStyle = opts.color ?? COLORS.ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, height / 2 + size * 0.04);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function makeDotTexture(renderer: THREE.WebGLRenderer) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = COLORS.ground;
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = COLORS.groundDot;
  ctx.beginPath();
  ctx.arc(32, 32, 3, 0, Math.PI * 2);
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(90, 90);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

// ---------------------------------------------------------------- helpers

function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function headingQuaternion(heading: number) {
  const q = new CANNON.Quaternion();
  q.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), heading);
  return q;
}

function venueLabel(venue: string, year: string) {
  if (/arxiv/i.test(venue)) return `arXiv ${year}`;
  if (/^preprint$/i.test(venue)) return `Preprint ${year}`;
  // "The Conference on ... (NeurIPS)" -> "NeurIPS 2025"
  const acronym = venue.match(/\(([^),]+)/)?.[1];
  const short = acronym ?? venue;
  return short.length > 24 ? `${short.slice(0, 22)}…` : `${short} ${year}`;
}

// ---------------------------------------------------------------- world

export function createWorld(
  canvas: HTMLCanvasElement,
  content: PlayContent,
  callbacks: WorldCallbacks,
): WorldHandle {
  const isCoarse = window.matchMedia("(pointer: coarse)").matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isCoarse ? 1.75 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.sky);
  scene.fog = new THREE.Fog(COLORS.sky, 60, 130);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 400);

  scene.add(new THREE.HemisphereLight("#fff8ec", "#c9b28c", 1.6));
  const sun = new THREE.DirectionalLight("#fff3dd", 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(isCoarse ? 1024 : 2048, isCoarse ? 1024 : 2048);
  sun.shadow.camera.left = -36;
  sun.shadow.camera.right = 36;
  sun.shadow.camera.top = 36;
  sun.shadow.camera.bottom = -36;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 120;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  scene.add(sun.target);

  const physics = new CANNON.World({ gravity: new CANNON.Vec3(0, -20, 0) });
  physics.broadphase = new CANNON.SAPBroadphase(physics);
  physics.allowSleep = true;
  const groundMaterial = new CANNON.Material("ground");
  const propMaterial = new CANNON.Material("prop");
  physics.addContactMaterial(new CANNON.ContactMaterial(groundMaterial, propMaterial, { friction: 0.35, restitution: 0.15 }));
  physics.addContactMaterial(new CANNON.ContactMaterial(propMaterial, propMaterial, { friction: 0.3, restitution: 0.2 }));
  // The wheels are raycasts, so the chassis box only touches the ground when
  // it scrapes a ramp lip or lands hard. Frictionless there, or it stalls.
  const chassisMaterial = new CANNON.Material("chassis");
  physics.addContactMaterial(new CANNON.ContactMaterial(groundMaterial, chassisMaterial, { friction: 0, restitution: 0 }));

  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T) => {
    disposables.push(item);
    return item;
  };

  const mat = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
    track(new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...extra }));

  // ---------------------------------------------------------- ground
  const groundTexture = track(makeDotTexture(renderer));
  const ground = new THREE.Mesh(
    track(new THREE.PlaneGeometry(240, 240)),
    track(new THREE.MeshStandardMaterial({ map: groundTexture, roughness: 1 })),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // A thick box rather than CANNON.Plane: cannon-es raycasts against a Plane
  // miss away from the origin, which would leave the wheels without contact.
  const groundBody = new CANNON.Body({ mass: 0, material: groundMaterial, shape: new CANNON.Box(new CANNON.Vec3(120, 1, 120)) });
  groundBody.position.set(0, -1, 0);
  physics.addBody(groundBody);

  const LIMIT = 72;
  for (const [x, z, hx, hz] of [
    [0, -LIMIT, LIMIT, 1],
    [0, LIMIT, LIMIT, 1],
    [-LIMIT, 0, 1, LIMIT],
    [LIMIT, 0, 1, LIMIT],
  ]) {
    const wall = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(hx, 4, hz)) });
    wall.position.set(x, 4, z);
    physics.addBody(wall);
  }

  // ---------------------------------------------------------- builders
  const groundText = (
    text: string,
    x: number,
    z: number,
    width: number,
    opts: { color?: string; y?: number; rotation?: number; weight?: number } = {},
  ) => {
    const aspect = 4;
    const texture = track(makeLabelTexture(text, renderer, { color: opts.color ?? COLORS.accent, weight: opts.weight }));
    const mesh = new THREE.Mesh(
      track(new THREE.PlaneGeometry(width, width / aspect)),
      track(
        new THREE.MeshStandardMaterial({
          map: texture,
          transparent: true,
          roughness: 1,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          depthWrite: false,
        }),
      ),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = opts.rotation ?? 0;
    mesh.position.set(x, opts.y ?? 0.02, z);
    mesh.receiveShadow = true;
    scene.add(mesh);
  };

  const staticBox = (x: number, y: number, z: number, w: number, h: number, d: number, rotationY = 0) => {
    const body = new CANNON.Body({ mass: 0, material: groundMaterial, shape: new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)) });
    body.position.set(x, y, z);
    body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotationY);
    physics.addBody(body);
    return body;
  };

  const texturedBox = (w: number, h: number, d: number, color: string, front: THREE.Texture) => {
    const side = mat(color);
    const face = track(new THREE.MeshStandardMaterial({ map: front, roughness: 0.9 }));
    const mesh = new THREE.Mesh(track(new THREE.BoxGeometry(w, h, d)), [side, side, side, side, face, side]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  const billboard = (x: number, z: number, w: number, h: number, texture: THREE.Texture, lift = 1.3) => {
    const group = new THREE.Group();
    const legMaterial = mat(COLORS.wood);
    const legGeometry = track(new THREE.BoxGeometry(0.35, lift + h, 0.35));
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(legGeometry, legMaterial);
      leg.position.set(side * (w / 2 - 0.6), (lift + h) / 2, -0.25);
      leg.castShadow = true;
      group.add(leg);
    }
    const board = texturedBox(w, h, 0.3, COLORS.paper, texture);
    board.position.set(0, lift + h / 2, 0);
    group.add(board);
    group.position.set(x, 0, z);
    scene.add(group);
    staticBox(x, (lift + h) / 2, z - 0.1, w, lift + h, 0.6);
  };

  const zones: Zone[] = [];
  const addZone = (id: string, area: string, x: number, z: number, r: number) => zones.push({ id, area, x, z, r });

  const areas: Area[] = [];
  const addArea = (id: string, label: string, x: number, z: number, heading = Math.PI / 2) =>
    areas.push({ id, label, x, z, heading });

  // ---------------------------------------------------------- start
  addArea("start", "Start", 0, 4);
  groundText(content.profile.name.toUpperCase(), 0, 9, 22, { color: COLORS.ink });
  groundText(`${content.profile.role} · ${content.profile.affiliation}`, 0, 12.4, 16, { color: COLORS.accent, weight: 700 });

  // ---------------------------------------------------------- about
  addArea("about", "About", 0, -13);
  billboard(
    0,
    -25,
    14,
    7.5,
    track(
      makePanelTexture(
        {
          width: 1400,
          height: 750,
          eyebrow: "About me",
          title: content.profile.name,
          titleSize: 86,
          body: content.profile.bio,
          bodySize: 30,
          maxBodyLines: 12,
        },
        renderer,
      ),
    ),
  );
  addZone("about", "about", 0, -18, 6.5);

  // ---------------------------------------------------------- link pads
  const padGeometry = track(new THREE.CylinderGeometry(2, 2, 0.12, 40));
  const padMaterial = mat(COLORS.pad, { roughness: 0.5, emissive: new THREE.Color(COLORS.accent), emissiveIntensity: 0.15 });
  const padRings: THREE.Mesh[] = [];
  content.links.forEach((link, index) => {
    const x = (index - (content.links.length - 1) / 2) * 5.5;
    const z = -5;
    const pad = new THREE.Mesh(padGeometry, padMaterial);
    pad.position.set(x, 0.06, z);
    pad.receiveShadow = true;
    scene.add(pad);
    const ring = new THREE.Mesh(
      track(new THREE.TorusGeometry(2.25, 0.08, 8, 48)),
      mat("#ffffff", { emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0.4 }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.14, z);
    scene.add(ring);
    padRings.push(ring);
    groundText(link.label, x, z, 3.4, { color: "#ffffff", y: 0.14 });
    addZone(`link:${link.id}`, "links", x, z, 2.2);
  });

  // ---------------------------------------------------------- publications
  addArea("publications", "Publications", 27, -3.5, 0);
  const pubs = content.publications;
  const perRow = Math.ceil(pubs.length / 2);
  pubs.forEach((pub, index) => {
    const row = index < perRow ? 0 : 1;
    const col = row === 0 ? index : index - perRow;
    const x = 28 + col * 7;
    const z = row === 0 ? -9 : 7;
    const texture = track(
      makePanelTexture(
        {
          width: 512,
          height: 640,
          eyebrow: venueLabel(pub.venue, pub.year),
          title: pub.label,
          titleSize: 56,
          maxTitleLines: 6,
          bg: COLORS.paper,
        },
        renderer,
      ),
    );
    const slab = texturedBox(4.4, 5.5, 0.8, COLORS.accent, texture);
    slab.position.set(x, 2.75, z);
    scene.add(slab);
    staticBox(x, 2.75, z, 4.4, 5.5, 0.8);
    addZone(`pub:${index}`, "publications", x, z + 4, 3.2);
  });
  const pubEndX = 28 + perRow * 7;
  groundText("PUBLICATIONS", 28 + ((perRow - 1) * 7) / 2, -1, 24, { color: COLORS.accent });
  {
    const kiosk = texturedBox(
      4,
      3.2,
      2,
      COLORS.ink,
      track(makePanelTexture({ width: 512, height: 410, eyebrow: "Archive", title: "All publications →", titleSize: 58, bg: "#fff" }, renderer)),
    );
    kiosk.position.set(pubEndX + 2, 1.6, -0.5);
    scene.add(kiosk);
    staticBox(pubEndX + 2, 1.6, -0.5, 4, 3.2, 2);
    addZone("allpubs", "publications", pubEndX + 2, 3.2, 3.2);
  }

  // ---------------------------------------------------------- posts
  addArea("posts", "Posts", -24, 3);
  content.posts.forEach((post, index) => {
    const x = -24 - index * 14;
    const z = -6;
    billboard(
      x,
      z,
      11,
      6,
      track(
        makePanelTexture(
          {
            width: 1100,
            height: 600,
            eyebrow: `Post · ${post.date}`,
            title: post.title,
            titleSize: 74,
            body: [post.description],
            bodySize: 34,
            footer: "read the post →",
          },
          renderer,
        ),
      ),
      1.1,
    );
    addZone(`post:${index}`, "posts", x, z + 5, 4.2);
  });
  groundText("POSTS", -31, 3.5, 12, { color: COLORS.accent });

  // ---------------------------------------------------------- education
  addArea("education", "Education", -34, -16);
  content.education.forEach((item, index) => {
    const x = -27 - index * 15;
    const z = -32;
    const building = texturedBox(
      10,
      6,
      6,
      "#f6efe2",
      track(
        makePanelTexture(
          {
            width: 1000,
            height: 600,
            eyebrow: item.period,
            title: item.institution,
            titleSize: 70,
            body: [item.degree, ...(item.note ? [item.note] : [])],
            bodySize: 40,
            bg: "#f6efe2",
          },
          renderer,
        ),
      ),
    );
    building.position.set(x, 3, z);
    scene.add(building);
    const roof = new THREE.Mesh(track(new THREE.ConeGeometry(7.6, 3, 4)), mat(index === 0 ? COLORS.accentDark : "#a8553a"));
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1, 1, 0.62);
    roof.position.set(x, 7.5, z);
    roof.castShadow = true;
    scene.add(roof);
    staticBox(x, 3, z, 10, 6, 6);
  });
  groundText("EDUCATION", -34, -24.5, 14, { color: COLORS.accent });
  addZone("education", "education", -34, -22, 8);

  // ---------------------------------------------------------- news
  addArea("news", "News", 32, -18);
  {
    const latest = content.news.slice(0, 4);
    billboard(
      32,
      -30,
      13,
      7,
      track(
        makePanelTexture(
          {
            width: 1300,
            height: 700,
            eyebrow: "Latest news",
            title: latest[0] ? `${latest[0].date}` : "News",
            titleSize: 62,
            body: latest.map((item) => `${item.date} — ${item.content}`),
            bodySize: 32,
            maxBodyLines: 13,
          },
          renderer,
        ),
      ),
    );
    groundText("NEWS", 32, -21.5, 9, { color: COLORS.accent });
    addZone("news", "news", 32, -23, 6.5);
  }

  // ---------------------------------------------------------- ramp + awards
  addArea("awards", "Awards", 0, 54);
  {
    const angle = 0.26; // positive tilt raises the north (-z) end
    const length = 9;
    const ramp = new THREE.Mesh(track(new THREE.BoxGeometry(6, 0.5, length)), mat("#d79a4b"));
    ramp.rotation.x = angle;
    // Sink the low end so its top edge sits flush with the ground.
    const rampY = Math.sin(angle) * (length / 2) - 0.25 / Math.cos(angle);
    ramp.position.set(0, rampY, 22);
    ramp.castShadow = true;
    ramp.receiveShadow = true;
    scene.add(ramp);
    const rampBody = new CANNON.Body({ mass: 0, material: groundMaterial, shape: new CANNON.Box(new CANNON.Vec3(3, 0.25, length / 2)) });
    rampBody.position.set(0, rampY, 22);
    rampBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), angle);
    physics.addBody(rampBody);
    groundText("JUMP! ↑", 0, 29, 7, { color: "#d77a2b" });
  }

  const trophyMaterial = mat(COLORS.gold, { metalness: 0.6, roughness: 0.35 });
  const pedestalCount = content.awards.length;
  content.awards.forEach((award, index) => {
    // Two wings with a lane in the middle, so you can drive through the
    // trophy hall straight onto the ramp.
    const spread = 4.2;
    const lane = 7;
    const half = Math.ceil(pedestalCount / 2);
    const x =
      index < half
        ? -(lane / 2 + spread / 2 + (half - 1 - index) * spread)
        : lane / 2 + spread / 2 + (index - half) * spread;
    const z = 44 - Math.abs(x) * 0.08;
    const height = 1.2 + ((pedestalCount - index) / pedestalCount) * 1.4;
    const pedestal = texturedBox(
      3.4,
      height,
      2,
      "#f6efe2",
      track(
        makePanelTexture(
          {
            width: 512,
            height: Math.round(512 * (height / 3.4)),
            eyebrow: award.year,
            title: award.title,
            titleSize: 44,
            maxTitleLines: 3,
            bg: "#fffaf0",
            accent: "#b8860b",
          },
          renderer,
        ),
      ),
    );
    pedestal.position.set(x, height / 2, z);
    scene.add(pedestal);
    staticBox(x, height / 2, z, 3.4, height, 2);

    const cup = new THREE.Mesh(track(new THREE.CylinderGeometry(0.55, 0.25, 0.9, 16)), trophyMaterial);
    cup.position.set(x, height + 0.85, z);
    cup.castShadow = true;
    const stem = new THREE.Mesh(track(new THREE.CylinderGeometry(0.1, 0.35, 0.45, 12)), trophyMaterial);
    stem.position.set(x, height + 0.22, z);
    stem.castShadow = true;
    scene.add(cup, stem);
  });
  groundText("AWARDS & HONORS", 0, 49, 18, { color: "#b8860b" });
  addZone("awards", "awards", 0, 50, 8);

  // ---------------------------------------------------------- playground: bowling
  addArea("bowling", "Bowling", 26, 36, Math.PI / 2);
  type Prop = { body: CANNON.Body; mesh: THREE.Object3D; home: CANNON.Vec3; down: boolean };
  const pins: Prop[] = [];
  const crates: Prop[] = [];
  {
    const laneX = 26;
    const lane = new THREE.Mesh(track(new THREE.PlaneGeometry(5, 18)), mat("#e7c995"));
    lane.rotation.x = -Math.PI / 2;
    lane.position.set(laneX, 0.015, 29);
    lane.receiveShadow = true;
    scene.add(lane);
    groundText("BOWLING", laneX, 39, 8, { color: "#d77a2b" });

    const pinMaterial = mat("#ffffff", { roughness: 0.4 });
    const stripeMaterial = mat("#d64545", { roughness: 0.4 });
    const pinGeometry = track(new THREE.CylinderGeometry(0.2, 0.32, 1.4, 14));
    const stripeGeometry = track(new THREE.CylinderGeometry(0.235, 0.24, 0.14, 14));
    const shape = new CANNON.Cylinder(0.2, 0.32, 1.4, 10);
    for (let row = 0; row < 4; row += 1) {
      for (let i = 0; i <= row; i += 1) {
        const x = laneX + (i - row / 2) * 0.95;
        const z = 23 - row * 0.85;
        const body = new CANNON.Body({ mass: 1.2, material: propMaterial, shape });
        body.position.set(x, 0.7, z);
        body.sleepSpeedLimit = 0.3;
        body.allowSleep = true;
        body.sleep();
        physics.addBody(body);
        const group = new THREE.Group();
        const pinMesh = new THREE.Mesh(pinGeometry, pinMaterial);
        pinMesh.castShadow = true;
        const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
        stripe.position.y = 0.35;
        group.add(pinMesh, stripe);
        scene.add(group);
        pins.push({ body, mesh: group, home: body.position.clone(), down: false });
      }
    }
    addZone("bowling", "bowling", laneX, 31, 7);
  }

  // ---------------------------------------------------------- playground: crates
  addArea("crates", "Crate stack", -24, 34, Math.PI / 2);
  {
    const words = ["Adam", "ReLU", "loss", "LoRA", "KL", "∇θ", "softmax", "dropout", "attention", "Hessian"];
    const palette = ["#2673bd", "#d77a2b", "#4f9a6b", "#c4504a", "#7a5bb5"];
    const shape = new CANNON.Box(new CANNON.Vec3(0.6, 0.6, 0.6));
    const geometry = track(new THREE.BoxGeometry(1.2, 1.2, 1.2));
    let k = 0;
    for (let level = 0; level < 4; level += 1) {
      const count = 4 - level;
      for (let i = 0; i < count; i += 1) {
        const word = words[k % words.length];
        const color = palette[k % palette.length];
        const texture = track(makeLabelTexture(word, renderer, { bg: color, color: "#fff", width: 256, height: 256, size: 64, weight: 800 }));
        const material = track(new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 }));
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        const body = new CANNON.Body({ mass: 2, material: propMaterial, shape });
        body.position.set(-24 + (i - (count - 1) / 2) * 1.25, 0.6 + level * 1.2, 22);
        body.allowSleep = true;
        body.sleepSpeedLimit = 0.3;
        physics.addBody(body);
        body.sleep();
        crates.push({ body, mesh, home: body.position.clone(), down: false });
        k += 1;
      }
    }
    groundText("KNOCK DOWN THE STACK", -24, 27.5, 12, { color: "#d77a2b" });
    addZone("crates", "crates", -24, 29, 7);
  }

  // ---------------------------------------------------------- trees
  {
    const rand = seededRandom(7);
    const avoid = [
      ...zones.map((zone) => ({ x: zone.x, z: zone.z, r: zone.r + 5 })),
      { x: 0, z: 6, r: 14 },
      { x: 0, z: -25, r: 10 },
      { x: 32, z: -30, r: 10 },
      { x: 0, z: 24, r: 9 },
      { x: 0, z: 46, r: 16 },
      { x: 26, z: 29, r: 11 },
      { x: -24, z: 27, r: 10 },
      { x: -34, z: -32, r: 18 },
    ];
    const pubBox = { minX: 22, maxX: pubEndX + 6, minZ: -14, maxZ: 14 };
    const trunkGeometry = track(new THREE.CylinderGeometry(0.22, 0.3, 1.4, 6));
    const leafGeometry = track(new THREE.IcosahedronGeometry(1.4, 0));
    const trunkMaterial = mat(COLORS.wood);
    const leafMaterials = COLORS.leaf.map((color) => mat(color, { flatShading: true }));
    let placed = 0;
    let attempts = 0;
    while (placed < 95 && attempts < 2000) {
      attempts += 1;
      const x = (rand() * 2 - 1) * (LIMIT - 4);
      const z = (rand() * 2 - 1) * (LIMIT - 4);
      if (avoid.some((a) => (a.x - x) ** 2 + (a.z - z) ** 2 < a.r ** 2)) continue;
      if (x > pubBox.minX && x < pubBox.maxX && z > pubBox.minZ && z < pubBox.maxZ) continue;
      const radius = Math.hypot(x, z);
      if (radius < 40 && rand() < 0.65) continue;
      const scale = 0.8 + rand() * 0.9;
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.position.y = 0.7;
      trunk.castShadow = true;
      const leaves = new THREE.Mesh(leafGeometry, leafMaterials[Math.floor(rand() * leafMaterials.length)]);
      leaves.position.y = 2.2;
      leaves.rotation.set(rand(), rand(), rand());
      leaves.castShadow = true;
      tree.add(trunk, leaves);
      tree.scale.setScalar(scale);
      tree.position.set(x, 0, z);
      scene.add(tree);
      const body = new CANNON.Body({ mass: 0, shape: new CANNON.Cylinder(0.35 * scale, 0.35 * scale, 3 * scale, 8) });
      body.position.set(x, 1.5 * scale, z);
      physics.addBody(body);
      placed += 1;
    }
  }

  // ---------------------------------------------------------- car
  const chassisBody = new CANNON.Body({ mass: CAR.mass, material: chassisMaterial });
  chassisBody.addShape(new CANNON.Box(CAR.halfExtents), new CANNON.Vec3(0, 0, 0));
  chassisBody.addShape(new CANNON.Box(new CANNON.Vec3(0.75, 0.28, 0.65)), new CANNON.Vec3(-0.3, 0.6, 0));
  chassisBody.angularDamping = 0.4;
  chassisBody.allowSleep = false;

  const vehicle = new CANNON.RaycastVehicle({
    chassisBody,
    indexRightAxis: 2,
    indexUpAxis: 1,
    indexForwardAxis: 0,
  });
  const wheelOptions = {
    radius: CAR.wheelRadius,
    directionLocal: new CANNON.Vec3(0, -1, 0),
    axleLocal: new CANNON.Vec3(0, 0, 1),
    suspensionStiffness: 32,
    suspensionRestLength: 0.35,
    frictionSlip: 2.2,
    dampingRelaxation: 2.4,
    dampingCompression: 4.2,
    maxSuspensionForce: 100000,
    rollInfluence: 0.02,
    maxSuspensionTravel: 0.3,
    customSlidingRotationalSpeed: -30,
    useCustomSlidingRotationalSpeed: true,
    chassisConnectionPointLocal: new CANNON.Vec3(),
  };
  for (const [x, z] of [
    [1.05, 0.82],
    [1.05, -0.82],
    [-1.05, 0.82],
    [-1.05, -0.82],
  ]) {
    wheelOptions.chassisConnectionPointLocal = new CANNON.Vec3(x, -0.15, z);
    vehicle.addWheel({ ...wheelOptions });
  }
  vehicle.addToWorld(physics);

  const carGroup = new THREE.Group();
  {
    const body = new THREE.Mesh(track(new THREE.BoxGeometry(3.0, 0.7, 1.56)), mat(COLORS.accent, { roughness: 0.45 }));
    body.castShadow = true;
    const cabin = new THREE.Mesh(track(new THREE.BoxGeometry(1.5, 0.56, 1.3)), mat("#f7f3ea", { roughness: 0.4 }));
    cabin.position.set(-0.3, 0.62, 0);
    cabin.castShadow = true;
    const windshield = new THREE.Mesh(track(new THREE.BoxGeometry(0.05, 0.42, 1.18)), mat("#3a4a5c", { roughness: 0.2 }));
    windshield.position.set(0.46, 0.64, 0);
    const lightMaterial = mat("#fff3b0", { emissive: new THREE.Color("#ffe58a"), emissiveIntensity: 0.8 });
    const lightGeometry = track(new THREE.BoxGeometry(0.08, 0.18, 0.3));
    const tailMaterial = mat("#d64545", { emissive: new THREE.Color("#d64545"), emissiveIntensity: 0.5 });
    for (const side of [-1, 1]) {
      const light = new THREE.Mesh(lightGeometry, lightMaterial);
      light.position.set(1.52, 0.08, side * 0.52);
      const tail = new THREE.Mesh(lightGeometry, tailMaterial);
      tail.position.set(-1.52, 0.08, side * 0.52);
      carGroup.add(light, tail);
    }
    const stripe = new THREE.Mesh(track(new THREE.BoxGeometry(3.02, 0.08, 0.3)), mat("#ffffff"));
    stripe.position.set(0, 0.36, 0);
    carGroup.add(body, cabin, windshield, stripe);
  }
  scene.add(carGroup);

  const wheelMeshes: THREE.Object3D[] = [];
  {
    const tire = track(new THREE.CylinderGeometry(CAR.wheelRadius, CAR.wheelRadius, 0.38, 18));
    tire.rotateX(Math.PI / 2);
    const hub = track(new THREE.CylinderGeometry(0.2, 0.2, 0.4, 10));
    hub.rotateX(Math.PI / 2);
    const tireMaterial = mat("#2f2f33", { roughness: 0.9 });
    const hubMaterial = mat("#d9d9d9", { roughness: 0.5 });
    for (let i = 0; i < 4; i += 1) {
      const wheel = new THREE.Group();
      const t = new THREE.Mesh(tire, tireMaterial);
      t.castShadow = true;
      wheel.add(t, new THREE.Mesh(hub, hubMaterial));
      scene.add(wheel);
      wheelMeshes.push(wheel);
    }
  }

  const placeCar = (x: number, z: number, heading: number) => {
    chassisBody.position.set(x, 1.4, z);
    chassisBody.quaternion.copy(headingQuaternion(heading));
    chassisBody.velocity.setZero();
    chassisBody.angularVelocity.setZero();
    chassisBody.force.setZero();
    chassisBody.torque.setZero();
    cameraSnap = true;
  };

  // ---------------------------------------------------------- loop state
  let input: InputState = { forward: false, backward: false, left: false, right: false, brake: false };
  let steering = 0;
  let flippedFor = 0;
  let currentZone: string | null = null;
  let lastStats = "";
  const visited = new Set<string>();
  let cameraSnap = true;
  const cameraTarget = new THREE.Vector3();
  const cameraOffset = new THREE.Vector3(9, 21, 21);
  const forwardWorld = new CANNON.Vec3();
  const upWorld = new CANNON.Vec3();

  placeCar(0, 4, Math.PI / 2);

  const resize = () => {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Pull the camera back on narrow screens so the road ahead stays visible.
    camera.fov = camera.aspect < 0.8 ? 55 : 40;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize);

  const syncProp = (prop: Prop) => {
    prop.mesh.position.set(prop.body.position.x, prop.body.position.y, prop.body.position.z);
    prop.mesh.quaternion.set(prop.body.quaternion.x, prop.body.quaternion.y, prop.body.quaternion.z, prop.body.quaternion.w);
  };

  const updateDrive = (dt: number) => {
    chassisBody.quaternion.vmult(new CANNON.Vec3(1, 0, 0), forwardWorld);
    const forwardSpeed = chassisBody.velocity.dot(forwardWorld);
    const speed = chassisBody.velocity.length();

    let engine = 0;
    let brake = 0;
    if (input.forward && !input.backward) {
      if (forwardSpeed < -1) brake = CAR.brakeForce;
      else if (forwardSpeed < CAR.maxSpeed) engine = CAR.engineForce;
    } else if (input.backward && !input.forward) {
      if (forwardSpeed > 1) brake = CAR.brakeForce;
      else if (forwardSpeed > -CAR.maxSpeed * 0.45) engine = -CAR.reverseForce;
    } else {
      brake = 1.2;
    }
    if (input.brake) brake = CAR.brakeForce * 1.6;

    // Rear-wheel drive. With forward = +x, a positive force drives forward
    // and a positive steering value turns left.
    vehicle.applyEngineForce(engine, 2);
    vehicle.applyEngineForce(engine, 3);
    for (let i = 0; i < 4; i += 1) vehicle.setBrake(brake, i);

    const steerTarget = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    const steerLimit = CAR.maxSteer * (1 - Math.min(speed / 40, 0.45));
    steering += (steerTarget * steerLimit - steering) * Math.min(1, dt * 10);
    vehicle.setSteeringValue(steering, 0);
    vehicle.setSteeringValue(steering, 1);

    chassisBody.quaternion.vmult(new CANNON.Vec3(0, 1, 0), upWorld);
    if (upWorld.y < 0.25) flippedFor += dt;
    else flippedFor = 0;
    if (flippedFor > 1.4 || chassisBody.position.y < -5) {
      const heading = Math.atan2(-forwardWorld.z, forwardWorld.x);
      placeCar(chassisBody.position.x, chassisBody.position.z, heading);
      flippedFor = 0;
    }
  };

  const updateZones = () => {
    const x = chassisBody.position.x;
    const z = chassisBody.position.z;
    let best: Zone | null = null;
    let bestScore = 1;
    for (const zone of zones) {
      const score = Math.hypot(zone.x - x, zone.z - z) / zone.r;
      if (score < bestScore) {
        bestScore = score;
        best = zone;
      }
    }
    const id = best?.id ?? null;
    if (id !== currentZone) {
      currentZone = id;
      callbacks.onZoneChange(id);
    }
    if (best && !visited.has(best.area)) {
      visited.add(best.area);
      callbacks.onAreaVisit(best.area);
    }
  };

  const updateStats = () => {
    let pinsDown = 0;
    for (const pin of pins) {
      if (!pin.down) {
        const up = pin.body.quaternion.vmult(new CANNON.Vec3(0, 1, 0));
        if (up.y < 0.6 || pin.body.position.distanceTo(pin.home) > 1.6) pin.down = true;
      }
      if (pin.down) pinsDown += 1;
    }
    let cratesMoved = 0;
    for (const crate of crates) {
      if (!crate.down && crate.body.position.distanceTo(crate.home) > 1) crate.down = true;
      if (crate.down) cratesMoved += 1;
    }
    const key = `${pinsDown}/${cratesMoved}`;
    if (key !== lastStats) {
      lastStats = key;
      callbacks.onStats({ pinsDown, pinsTotal: pins.length, cratesMoved, cratesTotal: crates.length });
    }
  };

  let frame = 0;
  let last = performance.now();
  let disposed = false;
  let elapsed = 0;

  const tick = (now: number) => {
    if (disposed) return;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    elapsed += dt;

    updateDrive(dt);
    physics.step(1 / 60, dt, 4);

    carGroup.position.set(chassisBody.position.x, chassisBody.position.y, chassisBody.position.z);
    carGroup.quaternion.set(chassisBody.quaternion.x, chassisBody.quaternion.y, chassisBody.quaternion.z, chassisBody.quaternion.w);
    for (let i = 0; i < 4; i += 1) {
      vehicle.updateWheelTransform(i);
      const t = vehicle.wheelInfos[i].worldTransform;
      wheelMeshes[i].position.set(t.position.x, t.position.y, t.position.z);
      wheelMeshes[i].quaternion.set(t.quaternion.x, t.quaternion.y, t.quaternion.z, t.quaternion.w);
    }
    for (const prop of pins) syncProp(prop);
    for (const prop of crates) syncProp(prop);

    const pulse = 1 + Math.sin(elapsed * 3) * 0.06;
    for (const ring of padRings) ring.scale.set(pulse, pulse, 1);

    const carPos = carGroup.position;
    const desired = carPos.clone().add(cameraOffset);
    if (camera.aspect < 0.8) desired.add(new THREE.Vector3(2, 6, 6));
    if (cameraSnap) {
      camera.position.copy(desired);
      cameraTarget.copy(carPos);
      cameraSnap = false;
    } else {
      camera.position.lerp(desired, 1 - Math.exp(-dt * 4));
      cameraTarget.lerp(carPos, 1 - Math.exp(-dt * 8));
    }
    camera.lookAt(cameraTarget);

    sun.position.set(carPos.x + 18, 34, carPos.z + 10);
    sun.target.position.copy(carPos);

    updateZones();
    if (frame % 10 === 0) updateStats();
    frame += 1;

    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  };
  let raf = requestAnimationFrame(tick);

  if (new URLSearchParams(window.location.search).has("debug")) {
    (window as unknown as { __drive?: unknown }).__drive = { chassisBody, vehicle, getInput: () => input, getFrame: () => frame };
  }

  callbacks.onStats({ pinsDown: 0, pinsTotal: pins.length, cratesMoved: 0, cratesTotal: crates.length });

  return {
    areas,
    setInput(next) {
      input = next;
    },
    teleport(areaId) {
      const area = areas.find((item) => item.id === areaId);
      if (area) placeCar(area.x, area.z, area.heading);
    },
    reset() {
      chassisBody.quaternion.vmult(new CANNON.Vec3(1, 0, 0), forwardWorld);
      placeCar(chassisBody.position.x, chassisBody.position.z, Math.atan2(-forwardWorld.z, forwardWorld.x));
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      for (const item of disposables) item.dispose();
      renderer.dispose();
    },
  };
}
