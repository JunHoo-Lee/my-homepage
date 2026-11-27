// The voxel expedition runtime: renderer, sky, player physics, mining and
// placing, landmark discovery, map and compass drawing, and persistence.

import * as THREE from "three";

import { B, BLOCKS, CRACK_TILES, CROSS, ITEMS, MAP_COLORS, SOLID, blockIcon, paintAtlas, tileUV } from "./atlas";
import { buildChunk, type MeshData } from "./mesher";
import { createSfx } from "./sfx";
import { CHUNK, CHUNKS_X, CHUNKS_Z, D, H, SEA, W, generateWorld, idx, inWorld, relight, type Landmark, type World } from "./terrain";

export type ExploreCallbacks = {
  onProgress(fraction: number): void;
  onReady(): void;
  onNear(id: string | null): void;
  onDiscover(id: string, discovered: string[], fresh: boolean): void;
  onInventory(counts: number[], selected: number): void;
  onCrystals(found: number, total: number): void;
  onToast(message: string): void;
  onUnderwater(under: boolean): void;
  onLock(locked: boolean): void;
};

export type ExploreHandle = {
  landmarks: Landmark[];
  icons: string[];
  itemNames: string[];
  setMove(x: number, y: number): void;
  addLook(dx: number, dy: number): void;
  setJump(held: boolean): void;
  setMining(held: boolean): void;
  place(): void;
  selectSlot(slot: number): void;
  setPaused(paused: boolean): void;
  travel(id: string): void;
  drawMap(canvas: HTMLCanvasElement): void;
  setMuted(muted: boolean): void;
  resetWorld(): void;
  lock(): void;
  dispose(): void;
};

type Save = {
  v: number;
  discovered: string[];
  crystals: number[];
  inv: number[];
  edits: [number, number][];
  pos: number[] | null;
  explored: number[];
  time: number;
};

const SAVE_KEY = "explore-save-v1";
const SEED = 4127;
const DAY_SECONDS = 540;
const REACH = 5.5;
const HALF = 0.3;
const TALL = 1.8;
const EYE = 1.62;
const FOG_CELL = 8;
const FOG_W = W / FOG_CELL;

const VERTEX = /* glsl */ `
attribute vec3 shade;
varying vec2 vUv;
varying vec3 vShade;
varying float vDist;
void main() {
  vUv = uv;
  vShade = shade;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDist = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

const FRAGMENT = /* glsl */ `
uniform sampler2D map;
uniform vec3 uSky;
uniform vec3 uFog;
uniform float uFogNear;
uniform float uFogFar;
uniform float uAlpha;
varying vec2 vUv;
varying vec3 vShade;
varying float vDist;
void main() {
  vec4 texel = texture2D(map, vUv);
  if (texel.a < 0.5) discard;
  vec3 light = max(uSky * vShade.x, vec3(1.0, 0.8, 0.55) * vShade.y);
  vec3 color = texel.rgb * light * vShade.z;
  float fog = smoothstep(uFogNear, uFogFar, vDist);
  gl_FragColor = vec4(mix(color, uFog, fog), uAlpha);
}`;

const SKY_VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const SKY_FRAGMENT = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uSunDir;
uniform vec3 uGlow;
varying vec3 vDir;
void main() {
  vec3 dir = normalize(vDir);
  vec3 color = mix(uHorizon, uTop, pow(clamp(dir.y, 0.0, 1.0), 0.55));
  float sun = max(dot(dir, uSunDir), 0.0);
  color += uGlow * (pow(sun, 6.0) * 0.3 + pow(sun, 60.0) * 0.4);
  gl_FragColor = vec4(color, 1.0);
}`;

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mix3 = (a: number[], b: number[], t: number) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

function loadSave(): Save | null {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Save;
    return data && data.v === SEED && Array.isArray(data.edits) ? data : null;
  } catch {
    return null;
  }
}

function boxWithTiles(size: number, tiles: [number, number, number]) {
  const geometry = new THREE.BoxGeometry(size, size, size);
  const uv = geometry.getAttribute("uv") as THREE.BufferAttribute;
  for (let face = 0; face < 6; face++) {
    const [u0, v0, u1, v1] = tileUV(face === 2 ? tiles[0] : face === 3 ? tiles[2] : tiles[1]);
    for (let k = 0; k < 4; k++) {
      const i = face * 4 + k;
      uv.setXY(i, mix(u0, u1, uv.getX(i)), mix(v1, v0, uv.getY(i)));
    }
  }
  return geometry;
}

export function createExplore(
  canvas: HTMLCanvasElement,
  compass: HTMLCanvasElement | null,
  publicationCount: number,
  labels: Record<string, string>,
  cb: ExploreCallbacks,
  options: { touch: boolean; debug: boolean },
): ExploreHandle {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !options.touch, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, options.touch ? 1.5 : 2));
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xffffff, 260, 700);
  const camera = new THREE.PerspectiveCamera(72, 1, 0.08, 1000);
  camera.rotation.order = "YXZ";
  scene.add(camera);

  const sfx = createSfx();
  const fogFar = options.touch ? 100 : 150;

  // ---------------------------------------------------------- materials
  const atlasCanvas = paintAtlas();
  const makeTexture = (colorSpace: THREE.ColorSpace) => {
    const texture = new THREE.CanvasTexture(atlasCanvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.flipY = false;
    texture.colorSpace = colorSpace;
    return texture;
  };
  const atlas = makeTexture(THREE.NoColorSpace);
  const atlasSrgb = makeTexture(THREE.SRGBColorSpace);

  const shared = {
    map: { value: atlas },
    uSky: { value: new THREE.Vector3(1, 1, 1) },
    uFog: { value: new THREE.Vector3(0.7, 0.85, 0.97) },
    uFogNear: { value: fogFar * 0.5 },
    uFogFar: { value: fogFar },
  };
  const terrainMaterial = new THREE.ShaderMaterial({
    uniforms: { ...shared, uAlpha: { value: 1 } },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
  });
  const waterMaterial = new THREE.ShaderMaterial({
    uniforms: { ...shared, uAlpha: { value: 0.72 } },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  // ---------------------------------------------------------- sky
  const skyUniforms = {
    uTop: { value: new THREE.Vector3() },
    uHorizon: { value: new THREE.Vector3() },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uGlow: { value: new THREE.Vector3(1, 0.8, 0.5) },
  };
  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(600, 24, 14),
    new THREE.ShaderMaterial({ uniforms: skyUniforms, vertexShader: SKY_VERTEX, fragmentShader: SKY_FRAGMENT, side: THREE.BackSide, depthWrite: false }),
  );
  skyDome.renderOrder = -3;
  skyDome.frustumCulled = false;
  scene.add(skyDome);

  const discTexture = (draw: (ctx: CanvasRenderingContext2D, size: number) => void) => {
    const size = 64;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    draw(c.getContext("2d")!, size);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };
  const sunTexture = discTexture((ctx, size) => {
    const g = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,252,230,1)");
    g.addColorStop(0.32, "rgba(255,238,170,1)");
    g.addColorStop(0.4, "rgba(255,214,120,0.45)");
    g.addColorStop(1, "rgba(255,200,100,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  });
  const moonTexture = discTexture((ctx, size) => {
    ctx.fillStyle = "#e9edf7";
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c3cbe0";
    for (const [x, y, r] of [[26, 26, 4], [38, 34, 5], [30, 40, 3], [40, 24, 2.5]]) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  const celestial = (texture: THREE.Texture, scale: number) => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, fog: false, depthWrite: false, transparent: true }));
    sprite.scale.setScalar(scale);
    sprite.renderOrder = -2;
    scene.add(sprite);
    return sprite;
  };
  const sun = celestial(sunTexture, 150);
  const moon = celestial(moonTexture, 90);

  const starGeometry = new THREE.BufferGeometry();
  {
    const positions = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i++) {
      const u = Math.random() * Math.PI * 2;
      const v = Math.random() * 0.95 + 0.03;
      const r = Math.sqrt(1 - v * v);
      positions.set([Math.cos(u) * r * 560, v * 560, Math.sin(u) * r * 560], i * 3);
    }
    starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  }
  const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false });
  const stars = new THREE.Points(starGeometry, starMaterial);
  stars.renderOrder = -2;
  stars.frustumCulled = false;
  scene.add(stars);

  // clouds: a tiling layer of flat boxes that drifts east
  const CLOUD_CELL = 14;
  const CLOUD_GRID = 40;
  const CLOUD_SPAN = CLOUD_CELL * CLOUD_GRID;
  const cloudMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.92 });
  const clouds = new THREE.Group();
  {
    const lattice = (i: number, j: number) => {
      const a = ((i % 10) + 10) % 10;
      const b = ((j % 10) + 10) % 10;
      const h = Math.sin(a * 127.1 + b * 311.7 + 7.7) * 43758.5453;
      return h - Math.floor(h);
    };
    const value = (x: number, y: number) => {
      const xi = Math.floor(x);
      const yi = Math.floor(y);
      const fx = x - xi;
      const fy = y - yi;
      const sx = fx * fx * (3 - 2 * fx);
      const sy = fy * fy * (3 - 2 * fy);
      return mix(mix(lattice(xi, yi), lattice(xi + 1, yi), sx), mix(lattice(xi, yi + 1), lattice(xi + 1, yi + 1), sx), sy);
    };
    const filled = (i: number, j: number) => {
      const a = ((i % CLOUD_GRID) + CLOUD_GRID) % CLOUD_GRID;
      const b = ((j % CLOUD_GRID) + CLOUD_GRID) % CLOUD_GRID;
      return value(a / 4, b / 4) > 0.6;
    };
    const positions: number[] = [];
    const colors: number[] = [];
    const quad = (p: number[][], shade: number) => {
      for (const k of [0, 1, 2, 0, 2, 3]) {
        positions.push(...p[k]);
        colors.push(shade, shade, shade);
      }
    };
    for (let j = 0; j < CLOUD_GRID; j++) {
      for (let i = 0; i < CLOUD_GRID; i++) {
        if (!filled(i, j)) continue;
        const x0 = i * CLOUD_CELL;
        const x1 = x0 + CLOUD_CELL;
        const z0 = j * CLOUD_CELL;
        const z1 = z0 + CLOUD_CELL;
        const y0 = 0;
        const y1 = 5;
        quad([[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], 1);
        quad([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], 0.8);
        if (!filled(i + 1, j)) quad([[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], 0.92);
        if (!filled(i - 1, j)) quad([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], 0.92);
        if (!filled(i, j + 1)) quad([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], 0.86);
        if (!filled(i, j - 1)) quad([[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], 0.86);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    for (let a = -1; a <= 1; a++) {
      for (let b = -1; b <= 1; b++) {
        const mesh = new THREE.Mesh(geometry, cloudMaterial);
        mesh.position.set(a * CLOUD_SPAN, 0, b * CLOUD_SPAN);
        mesh.frustumCulled = false;
        clouds.add(mesh);
      }
    }
    clouds.position.y = 96;
    scene.add(clouds);
  }

  // open sea beyond the world edge
  {
    const far = 1400;
    const y = SEA + 0.86;
    const [u0, v0] = tileUV(BLOCKS[B.WATER].tiles[0]);
    const rects = [
      [-far, -far, W + far, 0],
      [-far, D, W + far, D + far],
      [-far, 0, 0, D],
      [W, 0, W + far, D],
    ];
    const position: number[] = [];
    const uv: number[] = [];
    const shade: number[] = [];
    for (const [x0, z0, x1, z1] of rects) {
      for (const [x, z] of [[x0, z1], [x1, z1], [x1, z0], [x0, z1], [x1, z0], [x0, z0]]) {
        position.push(x, y, z);
        uv.push(u0 + 0.01, v0 + 0.01);
        shade.push(150, 0, 255);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geometry.setAttribute("shade", new THREE.BufferAttribute(new Uint8Array(shade), 3, true));
    const sea = new THREE.Mesh(geometry, terrainMaterial);
    sea.frustumCulled = false;
    scene.add(sea);
  }

  // ---------------------------------------------------------- state
  const saved = loadSave();
  const discovered: string[] = saved?.discovered ?? [];
  const collected: number[] = saved?.crystals ?? [];
  const inventory: number[] = ITEMS.map((item, slot) => saved?.inv?.[slot] ?? (item === B.PLANKS ? 40 : item === B.LANTERN ? 12 : item === B.GLASS ? 8 : 0));
  const edits = new Map<number, number>(saved?.edits ?? []);
  const explored = new Uint8Array(FOG_W * (D / FOG_CELL));
  saved?.explored?.forEach((cell) => {
    if (cell >= 0 && cell < explored.length) explored[cell] = 1;
  });
  let time = saved?.time ?? 0.36;
  let selected = 4;
  let world: World | null = null;
  let disposed = false;
  let ready = false;
  let paused = true;
  let locked = false;

  const player = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: -0.08, ground: false, water: false };
  const input = { mx: 0, my: 0, jump: false, mining: false, sprint: false };
  const keys = new Set<string>();

  const chunkCount = CHUNKS_X * CHUNKS_Z;
  const solidMeshes: (THREE.Mesh | null)[] = new Array(chunkCount).fill(null);
  const waterMeshes: (THREE.Mesh | null)[] = new Array(chunkCount).fill(null);
  let pending: number[] = [];

  const toGeometry = (data: MeshData, ci: number) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(data.position, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(data.uv, 2));
    geometry.setAttribute("shade", new THREE.BufferAttribute(data.shade, 3, true));
    geometry.setIndex(new THREE.BufferAttribute(data.index, 1));
    const cx = (ci % CHUNKS_X) * CHUNK + CHUNK / 2;
    const cz = Math.floor(ci / CHUNKS_X) * CHUNK + CHUNK / 2;
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, H / 2, cz), 36);
    return geometry;
  };

  const meshChunk = (ci: number) => {
    if (!world) return;
    const data = buildChunk(world, ci % CHUNKS_X, Math.floor(ci / CHUNKS_X));
    const swap = (list: (THREE.Mesh | null)[], mesh: MeshData | null, material: THREE.Material, order: number) => {
      const old = list[ci];
      if (old) {
        old.geometry.dispose();
        scene.remove(old);
        list[ci] = null;
      }
      if (!mesh) return;
      const next = new THREE.Mesh(toGeometry(mesh, ci), material);
      next.renderOrder = order;
      next.matrixAutoUpdate = false;
      scene.add(next);
      list[ci] = next;
    };
    swap(solidMeshes, data.solid, terrainMaterial, 0);
    swap(waterMeshes, data.water, waterMaterial, 1);
  };

  // ---------------------------------------------------------- landmarks
  const beams = new Map<string, THREE.Mesh>();
  const labelSprites = new Map<string, THREE.Sprite>();
  const beamGeometry = new THREE.BoxGeometry(0.7, 160, 0.7);

  const labelTexture = (text: string, color: string) => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 96;
    const ctx = c.getContext("2d")!;
    ctx.font = "700 44px 'Helvetica Neue', Helvetica, Arial, sans-serif";
    const short = text.length > 22 ? `${text.slice(0, 21)}…` : text;
    const width = Math.min(500, ctx.measureText(short).width + 48);
    ctx.fillStyle = "rgba(16,20,34,0.78)";
    ctx.beginPath();
    ctx.roundRect((512 - width) / 2, 10, width, 76, 18);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(short, 256, 50, 460);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };

  const styleLandmark = (mark: Landmark) => {
    const found = discovered.includes(mark.id);
    const beam = beams.get(mark.id);
    if (beam) (beam.material as THREE.MeshBasicMaterial).opacity = found ? 0.1 : 0.42;
    const sprite = labelSprites.get(mark.id);
    if (sprite) {
      sprite.material.map?.dispose();
      sprite.material.map = labelTexture(found ? (labels[mark.id] ?? mark.id) : "? ? ?", mark.color);
      sprite.material.needsUpdate = true;
    }
  };

  const buildLandmarks = () => {
    if (!world) return;
    for (const mark of world.landmarks) {
      const beam = new THREE.Mesh(
        beamGeometry,
        new THREE.MeshBasicMaterial({ color: mark.color, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
      );
      beam.position.set(mark.x, mark.y + 78, mark.z);
      beam.renderOrder = 2;
      scene.add(beam);
      beams.set(mark.id, beam);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, fog: false, depthWrite: false }));
      sprite.position.set(mark.x, mark.y, mark.z);
      sprite.scale.set(9, 1.7, 1);
      sprite.renderOrder = 3;
      scene.add(sprite);
      labelSprites.set(mark.id, sprite);
      styleLandmark(mark);
    }
  };

  // ---------------------------------------------------------- helpers in the hand
  const highlight = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004)),
    new THREE.LineBasicMaterial({ color: 0x101018, transparent: true, opacity: 0.75, fog: false }),
  );
  highlight.visible = false;
  scene.add(highlight);

  const crackGeometries = CRACK_TILES.map((tile) => boxWithTiles(1.008, [tile, tile, tile]));
  const crackMesh = new THREE.Mesh(
    crackGeometries[0],
    new THREE.MeshBasicMaterial({ map: atlasSrgb, transparent: true, alphaTest: 0.5, opacity: 0.8, fog: false, depthWrite: false }),
  );
  crackMesh.visible = false;
  scene.add(crackMesh);

  const handMaterial = new THREE.MeshBasicMaterial({ map: atlasSrgb, alphaTest: 0.5, fog: false });
  const handGeometries = ITEMS.map((item) => boxWithTiles(0.15, BLOCKS[item].tiles));
  const hand = new THREE.Mesh(handGeometries[selected], handMaterial);
  hand.renderOrder = 10;
  camera.add(hand);
  let swing = 0;
  let bob = 0;

  // debris
  const DEBRIS = 96;
  const debrisPositions = new Float32Array(DEBRIS * 3).fill(-999);
  const debrisColors = new Float32Array(DEBRIS * 3);
  const debrisVelocity = new Float32Array(DEBRIS * 3);
  const debrisLife = new Float32Array(DEBRIS);
  const debrisGeometry = new THREE.BufferGeometry();
  debrisGeometry.setAttribute("position", new THREE.BufferAttribute(debrisPositions, 3));
  debrisGeometry.setAttribute("color", new THREE.BufferAttribute(debrisColors, 3));
  const debris = new THREE.Points(debrisGeometry, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, fog: false }));
  debris.frustumCulled = false;
  scene.add(debris);
  let debrisNext = 0;
  const burst = (x: number, y: number, z: number, block: number, amount: number) => {
    const [r, g, b] = MAP_COLORS[block] ?? [200, 200, 200];
    for (let n = 0; n < amount; n++) {
      const i = debrisNext++ % DEBRIS;
      debrisPositions.set([x + Math.random(), y + Math.random(), z + Math.random()], i * 3);
      debrisVelocity.set([(Math.random() - 0.5) * 3, Math.random() * 4 + 1, (Math.random() - 0.5) * 3], i * 3);
      const tint = 0.75 + Math.random() * 0.35;
      debrisColors.set([(r / 255) * tint, (g / 255) * tint, (b / 255) * tint], i * 3);
      debrisLife[i] = 0.5 + Math.random() * 0.4;
    }
    debrisGeometry.attributes.color.needsUpdate = true;
  };

  // butterflies by day, fireflies by night
  const MOTES = 36;
  const motePositions = new Float32Array(MOTES * 3);
  const moteSeeds = new Float32Array(MOTES * 4);
  const moteGeometry = new THREE.BufferGeometry();
  moteGeometry.setAttribute("position", new THREE.BufferAttribute(motePositions, 3));
  const moteMaterial = new THREE.PointsMaterial({ size: 0.2, color: 0xfff6c0, transparent: true, opacity: 0.9, fog: false, depthWrite: false });
  const motes = new THREE.Points(moteGeometry, moteMaterial);
  motes.frustumCulled = false;
  scene.add(motes);
  const placeMote = (i: number) => {
    if (!world) return;
    const x = clamp(player.x + (Math.random() - 0.5) * 44, 1, W - 2);
    const z = clamp(player.z + (Math.random() - 0.5) * 44, 1, D - 2);
    const ground = Math.max(SEA, world.top[Math.floor(z) * W + Math.floor(x)]);
    moteSeeds.set([x, ground + 1.4 + Math.random() * 2.5, z, Math.random() * 100], i * 4);
  };

  // ---------------------------------------------------------- world access
  const blockAt = (x: number, y: number, z: number) => {
    if (!world || y >= H) return B.AIR;
    if (y < 0 || x < 0 || x >= W || z < 0 || z >= D) return B.BEDROCK;
    return world.blocks[idx(x, y, z)];
  };
  const solidAt = (x: number, y: number, z: number) => SOLID[blockAt(x, y, z)] === 1;

  let saveTimer = 0;
  const save = () => {
    window.clearTimeout(saveTimer);
    saveTimer = 0;
    if (!ready) return;
    const cells: number[] = [];
    explored.forEach((value, cell) => {
      if (value) cells.push(cell);
    });
    const data: Save = {
      v: SEED,
      discovered,
      crystals: collected,
      inv: inventory,
      edits: [...edits].slice(-12000),
      pos: [player.x, player.y, player.z, player.yaw],
      explored: cells,
      time,
    };
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      // storage unavailable (private mode, quota): progress stays in memory
    }
  };
  const saveSoon = () => {
    if (!saveTimer) saveTimer = window.setTimeout(save, 1500);
  };

  const RADIUS = 15;
  const SIDE = RADIUS * 2 + 1;
  const snapSky = new Uint8Array(SIDE * SIDE * H);
  const snapBlk = new Uint8Array(SIDE * SIDE * H);

  const setBlock = (x: number, y: number, z: number, block: number) => {
    if (!world || !inWorld(x, y, z)) return;
    const { sky, blk } = world;
    const x0 = Math.max(0, x - RADIUS);
    const z0 = Math.max(0, z - RADIUS);
    const x1 = Math.min(W - 1, x + RADIUS);
    const z1 = Math.min(D - 1, z + RADIUS);
    let n = 0;
    for (let yy = 0; yy < H; yy++) {
      for (let zz = z0; zz <= z1; zz++) {
        const row = idx(x0, yy, zz);
        for (let xx = 0; xx <= x1 - x0; xx++) {
          snapSky[n] = sky[row + xx];
          snapBlk[n++] = blk[row + xx];
        }
      }
    }
    world.blocks[idx(x, y, z)] = block;
    edits.set(idx(x, y, z), block);
    relight(world, x0, z0, x1, z1);

    const dirty = new Set<number>();
    const touch = (xx: number, zz: number) => {
      const cx = xx >> 4;
      const cz = zz >> 4;
      dirty.add(cz * CHUNKS_X + cx);
      if ((xx & 15) === 0 && cx > 0) dirty.add(cz * CHUNKS_X + cx - 1);
      if ((xx & 15) === 15 && cx < CHUNKS_X - 1) dirty.add(cz * CHUNKS_X + cx + 1);
      if ((zz & 15) === 0 && cz > 0) dirty.add((cz - 1) * CHUNKS_X + cx);
      if ((zz & 15) === 15 && cz < CHUNKS_Z - 1) dirty.add((cz + 1) * CHUNKS_X + cx);
    };
    touch(x, z);
    n = 0;
    for (let yy = 0; yy < H; yy++) {
      for (let zz = z0; zz <= z1; zz++) {
        const row = idx(x0, yy, zz);
        for (let xx = 0; xx <= x1 - x0; xx++) {
          if (snapSky[n] !== sky[row + xx] || snapBlk[n] !== blk[row + xx]) touch(x0 + xx, zz);
          n++;
        }
      }
    }
    dirty.forEach(meshChunk);
    saveSoon();
  };

  // ---------------------------------------------------------- interaction
  const rayOrigin = new THREE.Vector3();
  const rayDir = new THREE.Vector3();
  const target = { hit: false, x: 0, y: 0, z: 0, px: 0, py: 0, pz: 0 };

  const raycast = () => {
    target.hit = false;
    camera.getWorldPosition(rayOrigin);
    camera.getWorldDirection(rayDir);
    let x = Math.floor(rayOrigin.x);
    let y = Math.floor(rayOrigin.y);
    let z = Math.floor(rayOrigin.z);
    const stepX = rayDir.x > 0 ? 1 : -1;
    const stepY = rayDir.y > 0 ? 1 : -1;
    const stepZ = rayDir.z > 0 ? 1 : -1;
    const deltaX = Math.abs(1 / (rayDir.x || 1e-9));
    const deltaY = Math.abs(1 / (rayDir.y || 1e-9));
    const deltaZ = Math.abs(1 / (rayDir.z || 1e-9));
    let maxX = (stepX > 0 ? x + 1 - rayOrigin.x : rayOrigin.x - x) * deltaX;
    let maxY = (stepY > 0 ? y + 1 - rayOrigin.y : rayOrigin.y - y) * deltaY;
    let maxZ = (stepZ > 0 ? z + 1 - rayOrigin.z : rayOrigin.z - z) * deltaZ;
    let px = x;
    let py = y;
    let pz = z;
    for (let travelled = 0; travelled < REACH; ) {
      const block = blockAt(x, y, z);
      if (block !== B.AIR && block !== B.WATER && inWorld(x, y, z)) {
        Object.assign(target, { hit: true, x, y, z, px, py, pz });
        return;
      }
      px = x;
      py = y;
      pz = z;
      if (maxX < maxY && maxX < maxZ) {
        travelled = maxX;
        maxX += deltaX;
        x += stepX;
      } else if (maxY < maxZ) {
        travelled = maxY;
        maxY += deltaY;
        y += stepY;
      } else {
        travelled = maxZ;
        maxZ += deltaZ;
        z += stepZ;
      }
    }
  };

  let mineKey = -1;
  let mineProgress = 0;
  let digTimer = 0;
  let protectedToast = 0;

  const breakTarget = () => {
    if (!world) return;
    const { x, y, z } = target;
    const block = blockAt(x, y, z);
    const info = BLOCKS[block];
    const wet =
      y <= SEA && [blockAt(x + 1, y, z), blockAt(x - 1, y, z), blockAt(x, y, z + 1), blockAt(x, y, z - 1), blockAt(x, y + 1, z)].includes(B.WATER);
    setBlock(x, y, z, wet ? B.WATER : B.AIR);
    if (CROSS[blockAt(x, y + 1, z)]) setBlock(x, y + 1, z, B.AIR);
    burst(x, y, z, block, 12);
    sfx.breakBlock();
    if (block === B.CRYSTAL) {
      const at = idx(x, y, z);
      if (world.crystals.includes(at) && !collected.includes(at)) {
        collected.push(at);
        sfx.crystal();
        cb.onCrystals(collected.length, world.crystals.length);
        cb.onToast(
          collected.length === world.crystals.length ? "Every crystal found. The island has no secrets left." : `Crystal found  ${collected.length}/${world.crystals.length}`,
        );
      }
    }
    const slot = (ITEMS as readonly number[]).indexOf(info.drop);
    if (slot >= 0) {
      inventory[slot] = Math.min(999, inventory[slot] + 1);
      cb.onInventory([...inventory], selected);
    }
  };

  const place = () => {
    if (!world || paused || !ready) return;
    raycast();
    if (!target.hit) return;
    const { px, py, pz } = target;
    const there = blockAt(px, py, pz);
    if (!inWorld(px, py, pz) || py >= H - 1 || (there !== B.AIR && there !== B.WATER && !CROSS[there])) return;
    if (inventory[selected] <= 0) {
      cb.onToast(`No ${BLOCKS[ITEMS[selected]].name.toLowerCase()} left. Mine some first.`);
      return;
    }
    const block = ITEMS[selected];
    if (SOLID[block]) {
      const overlaps =
        px + 1 > player.x - HALF && px < player.x + HALF && pz + 1 > player.z - HALF && pz < player.z + HALF && py + 1 > player.y && py < player.y + TALL;
      if (overlaps) return;
    }
    setBlock(px, py, pz, block);
    inventory[selected]--;
    cb.onInventory([...inventory], selected);
    sfx.place();
    swing = 1;
  };

  // ---------------------------------------------------------- physics
  const collides = (x: number, y: number, z: number) => {
    const x0 = Math.floor(x - HALF);
    const x1 = Math.floor(x + HALF);
    const y0 = Math.floor(y);
    const y1 = Math.floor(y + TALL);
    const z0 = Math.floor(z - HALF);
    const z1 = Math.floor(z + HALF);
    for (let yy = y0; yy <= y1; yy++) for (let zz = z0; zz <= z1; zz++) for (let xx = x0; xx <= x1; xx++) if (solidAt(xx, yy, zz)) return true;
    return false;
  };

  let stepDistance = 0;
  let wasInWater = false;

  const simulate = (dt: number) => {
    const mx = clamp(input.mx + (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0), -1, 1);
    const mz = clamp(input.my + (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0), -1, 1);
    const magnitude = Math.min(1, Math.hypot(mx, mz));
    const sprint = keys.has("ShiftLeft") || keys.has("ShiftRight") || Math.hypot(input.mx, input.my) > 0.92;
    const jump = input.jump || keys.has("Space");
    const sin = Math.sin(player.yaw);
    const cos = Math.cos(player.yaw);
    const length = Math.hypot(mx, mz) || 1;
    const wishX = ((-sin * mz + cos * mx) / length) * magnitude;
    const wishZ = ((-cos * mz - sin * mx) / length) * magnitude;

    player.water = blockAt(Math.floor(player.x), Math.floor(player.y + 0.5), Math.floor(player.z)) === B.WATER;
    if (player.water !== wasInWater) {
      if (Math.abs(player.vy) > 3) sfx.splash();
      wasInWater = player.water;
    }
    const speed = player.water ? 3.1 : sprint ? 6.6 : 4.5;
    const grip = player.water ? 6 : player.ground ? 13 : 3.5;
    player.vx += (wishX * speed - player.vx) * Math.min(1, grip * dt);
    player.vz += (wishZ * speed - player.vz) * Math.min(1, grip * dt);

    if (player.water) {
      player.vy += (jump ? 14 : -7) * dt;
      player.vy = clamp(player.vy, -3.2, 3.6);
      // climb out when swimming against a bank
      if (jump && (collides(player.x + wishX * 0.4, player.y, player.z + wishZ * 0.4) || player.ground)) player.vy = 6.4;
    } else {
      player.vy = Math.max(-42, player.vy - 27 * dt);
      if (jump && player.ground) player.vy = 8.3;
    }

    let blocked = false;
    player.x += player.vx * dt;
    if (collides(player.x, player.y, player.z)) {
      player.x = player.vx > 0 ? Math.floor(player.x + HALF) - HALF - 0.001 : Math.floor(player.x - HALF) + 1 + HALF + 0.001;
      player.vx = 0;
      blocked = true;
    }
    player.z += player.vz * dt;
    if (collides(player.x, player.y, player.z)) {
      player.z = player.vz > 0 ? Math.floor(player.z + HALF) - HALF - 0.001 : Math.floor(player.z - HALF) + 1 + HALF + 0.001;
      player.vz = 0;
      blocked = true;
    }
    player.y += player.vy * dt;
    player.ground = false;
    if (collides(player.x, player.y, player.z)) {
      if (player.vy < 0) {
        player.y = Math.floor(player.y) + 1 + 0.001;
        player.ground = true;
      } else {
        player.y = Math.floor(player.y + TALL) - TALL - 0.001;
      }
      player.vy = 0;
    }

    // step up single blocks automatically: essential on touch screens
    if (blocked && player.ground && magnitude > 0.2 && !player.water) {
      const ax = Math.floor(player.x + wishX * 0.7);
      const az = Math.floor(player.z + wishZ * 0.7);
      const fy = Math.floor(player.y);
      if (solidAt(ax, fy, az) && !solidAt(ax, fy + 1, az) && !solidAt(ax, fy + 2, az) && !solidAt(Math.floor(player.x), fy + 2, Math.floor(player.z))) {
        player.vy = 8.3;
        player.ground = false;
      }
    }

    player.x = clamp(player.x, 1.5, W - 1.5);
    player.z = clamp(player.z, 1.5, D - 1.5);
    if (player.y < -10) player.y = H;

    const moved = Math.hypot(player.vx, player.vz) * dt;
    if (player.ground && moved > 0) {
      stepDistance += moved;
      bob += moved * 2.4;
      if (stepDistance > 2.1) {
        stepDistance = 0;
        sfx.step();
      }
    }
    return sprint && magnitude > 0.5;
  };

  // ---------------------------------------------------------- sky and time
  const sunDir = new THREE.Vector3();
  const tmpColor = new THREE.Color();
  let daylight = 1;

  const updateSky = (underwater: boolean) => {
    const angle = time * Math.PI * 2;
    const elevation = -Math.cos(angle);
    sunDir.set(Math.sin(angle), elevation, 0.32).normalize();
    daylight = smooth(-0.2, 0.2, elevation + 0.08);
    const twilight = Math.exp(-((elevation / 0.24) ** 2));
    let top = mix3([0.015, 0.03, 0.09], [0.22, 0.5, 0.92], daylight);
    let horizon = mix3([0.06, 0.09, 0.2], [0.74, 0.88, 0.98], daylight);
    top = mix3(top, [0.32, 0.28, 0.56], twilight * 0.5);
    horizon = mix3(horizon, [1, 0.56, 0.32], twilight * 0.72);
    let light = mix3([0.2, 0.25, 0.42], [1, 1, 1], daylight);
    light = mix3(light, [1, 0.78, 0.6], twilight * 0.3 * daylight);
    let fog = horizon;
    let near = fogFar * 0.5;
    let far = fogFar;
    if (underwater) {
      fog = mix3([0.02, 0.06, 0.14], [0.1, 0.36, 0.6], daylight);
      near = 0.5;
      far = 26;
    }
    skyUniforms.uTop.value.set(top[0], top[1], top[2]);
    skyUniforms.uHorizon.value.set(horizon[0], horizon[1], horizon[2]);
    skyUniforms.uSunDir.value.copy(sunDir);
    skyUniforms.uGlow.value.set(1, 0.7, 0.4).multiplyScalar(0.4 + twilight);
    shared.uSky.value.set(light[0], light[1], light[2]);
    shared.uFog.value.set(fog[0], fog[1], fog[2]);
    shared.uFogNear.value = near;
    shared.uFogFar.value = far;
    (scene.fog as THREE.Fog).color.setRGB(horizon[0], horizon[1], horizon[2], THREE.SRGBColorSpace);
    cloudMaterial.color.setRGB(light[0], light[1], light[2], THREE.SRGBColorSpace);
    cloudMaterial.color.lerp(tmpColor.setRGB(horizon[0], horizon[1], horizon[2], THREE.SRGBColorSpace), 0.25);
    handMaterial.color.setRGB(light[0], light[1], light[2], THREE.SRGBColorSpace);
    starMaterial.opacity = (1 - daylight) * 0.9;
    stars.visible = daylight < 0.98;
    sun.position.copy(camera.position).addScaledVector(sunDir, 520);
    moon.position.copy(camera.position).addScaledVector(sunDir, -520);
    skyDome.position.copy(camera.position);
    stars.position.copy(camera.position);
    stars.rotation.z = angle * 0.2;
    moteMaterial.color.setRGB(mix(0.75, 1, daylight), 1, mix(0.35, 0.85, daylight), THREE.SRGBColorSpace);
    moteMaterial.size = mix(0.26, 0.16, daylight);
  };

  // ---------------------------------------------------------- compass and map
  const compassCtx = compass?.getContext("2d") ?? null;
  const drawCompass = () => {
    if (!compass || !compassCtx || !world) return;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = compass.clientWidth;
    const height = compass.clientHeight;
    if (!width) return;
    if (compass.width !== Math.round(width * ratio)) {
      compass.width = Math.round(width * ratio);
      compass.height = Math.round(height * ratio);
    }
    const ctx = compassCtx;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const heading = -player.yaw;
    const span = 1.25;
    const toX = (bearing: number) => {
      let off = bearing - heading;
      off = Math.atan2(Math.sin(off), Math.cos(off));
      return { x: width / 2 + (clamp(off, -span, span) / span) * (width / 2 - 10), edge: Math.abs(off) > span };
    };
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const NAMES = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    for (let step = 0; step < 24; step++) {
      const { x, edge } = toX((step * Math.PI) / 12);
      if (edge) continue;
      const major = step % 3 === 0;
      ctx.fillStyle = major ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.45)";
      if (major) {
        ctx.font = `700 ${step % 6 === 0 ? 13 : 10}px 'Helvetica Neue', Helvetica, Arial, sans-serif`;
        ctx.fillText(NAMES[step / 3], x, 10);
      } else ctx.fillRect(x - 0.5, 7, 1, 6);
    }
    let nearest: Landmark | null = null;
    let nearestDist = Infinity;
    for (const mark of world.landmarks) {
      const found = discovered.includes(mark.id);
      const dist = Math.hypot(mark.x - player.x, mark.z - player.z);
      if (!found && dist < nearestDist) {
        nearestDist = dist;
        nearest = mark;
      }
      const { x, edge } = toX(Math.atan2(mark.x - player.x, -(mark.z - player.z)));
      ctx.globalAlpha = edge ? 0.35 : found ? 0.55 : 1;
      ctx.fillStyle = mark.color;
      const size = found ? 3 : 4.5;
      ctx.beginPath();
      ctx.moveTo(x, 26 - size);
      ctx.lineTo(x + size, 26);
      ctx.lineTo(x, 26 + size);
      ctx.lineTo(x - size, 26);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (nearest) {
      const { x } = toX(Math.atan2(nearest.x - player.x, -(nearest.z - player.z)));
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x - 7, 19, 14, 14);
      ctx.font = "700 10px 'Helvetica Neue', Helvetica, Arial, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`${Math.round(nearestDist)} m`, clamp(x, 22, width - 22), 42);
    }
  };

  let mapBase: HTMLCanvasElement | null = null;
  const buildMapBase = () => {
    if (!world) return null;
    const base = document.createElement("canvas");
    base.width = W;
    base.height = D;
    const ctx = base.getContext("2d")!;
    const image = ctx.createImageData(W, D);
    for (let z = 0; z < D; z++) {
      for (let x = 0; x < W; x++) {
        const top = world.top[z * W + x];
        const block = world.blocks[idx(x, top, z)];
        let [r, g, b] = MAP_COLORS[block] ?? [110, 160, 90];
        let shade = 1;
        if (block === B.WATER) {
          let depth = 0;
          while (depth < 10 && world.blocks[idx(x, top - depth, z)] === B.WATER) depth++;
          shade = 1.12 - depth * 0.05;
        } else {
          const north = world.top[Math.max(0, z - 1) * W + Math.max(0, x - 1)];
          shade = clamp(1 + (top - north) * 0.09, 0.72, 1.28) * (0.86 + top / 200);
        }
        [r, g, b] = [r * shade, g * shade, b * shade];
        image.data.set([r, g, b, 255], (z * W + x) * 4);
      }
    }
    ctx.putImageData(image, 0, 0);
    return base;
  };

  const drawMap = (target2d: HTMLCanvasElement) => {
    if (!world) return;
    mapBase ??= buildMapBase();
    const ctx = target2d.getContext("2d");
    if (!ctx || !mapBase) return;
    const size = target2d.width;
    const scale = size / W;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(mapBase, 0, 0, size, size);
    ctx.fillStyle = "#d9c8a0";
    for (let cell = 0; cell < explored.length; cell++) {
      if (explored[cell]) continue;
      const cx = cell % FOG_W;
      const cz = Math.floor(cell / FOG_W);
      ctx.fillRect(Math.floor(cx * FOG_CELL * scale), Math.floor(cz * FOG_CELL * scale), Math.ceil(FOG_CELL * scale), Math.ceil(FOG_CELL * scale));
    }
    ctx.strokeStyle = "rgba(120,96,60,0.25)";
    ctx.lineWidth = 1;
    for (let line = 0; line <= W; line += 32) {
      ctx.beginPath();
      ctx.moveTo(line * scale, 0);
      ctx.lineTo(line * scale, size);
      ctx.moveTo(0, line * scale);
      ctx.lineTo(size, line * scale);
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(player.x * scale, player.z * scale);
    ctx.rotate(-player.yaw);
    ctx.fillStyle = "#e8402e";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    const s = Math.max(7, size / 60);
    ctx.beginPath();
    ctx.moveTo(0, -s * 1.3);
    ctx.lineTo(s * 0.85, s);
    ctx.lineTo(0, s * 0.45);
    ctx.lineTo(-s * 0.85, s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  const reveal = () => {
    const cx = Math.floor(player.x / FOG_CELL);
    const cz = Math.floor(player.z / FOG_CELL);
    let changed = false;
    for (let dz = -5; dz <= 5; dz++) {
      for (let dx = -5; dx <= 5; dx++) {
        const x = cx + dx;
        const z = cz + dz;
        if (x < 0 || z < 0 || x >= FOG_W || z >= D / FOG_CELL || dx * dx + dz * dz > 27) continue;
        if (!explored[z * FOG_W + x]) {
          explored[z * FOG_W + x] = 1;
          changed = true;
        }
      }
    }
    if (changed) saveSoon();
  };

  // ---------------------------------------------------------- discovery
  let nearId: string | null = null;
  const checkLandmarks = () => {
    if (!world) return;
    let best: Landmark | null = null;
    let bestDist = 8.5;
    for (const mark of world.landmarks) {
      const dist = Math.hypot(mark.x - player.x, mark.z - player.z);
      if (dist < bestDist && Math.abs(mark.home[1] - player.y) < 14) {
        bestDist = dist;
        best = mark;
      }
    }
    const id = best?.id ?? null;
    if (best && !discovered.includes(best.id)) {
      discovered.push(best.id);
      styleLandmark(best);
      sfx.discover();
      cb.onDiscover(best.id, [...discovered], true);
      saveSoon();
    }
    if (id !== nearId) {
      nearId = id;
      cb.onNear(id);
    }
  };

  // ---------------------------------------------------------- frame loop
  const resize = () => {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    // keep the held block in the lower right corner on any aspect ratio
    const portrait = camera.aspect < 1;
    hand.position.set(portrait ? 0.24 : 0.52, portrait ? -0.4 : -0.34, -0.8);
  };

  let last = performance.now();
  let frame = 0;
  let raf = 0;
  let slowTimer = 0;
  let underwater = false;
  let cloudDrift = 0;

  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    frame++;
    if (!world) return;

    if (pending.length) {
      const budget = performance.now() + (ready ? 4 : 14);
      while (pending.length && performance.now() < budget) meshChunk(pending.shift()!);
    }

    let sprinting = false;
    if (ready && !paused) {
      time = (time + dt / DAY_SECONDS) % 1;
      const steps = Math.max(1, Math.ceil(dt / (1 / 90)));
      for (let s = 0; s < steps; s++) sprinting = simulate(dt / steps);

      raycast();
      const active = input.mining && target.hit;
      if (active) {
        const key = idx(target.x, target.y, target.z);
        if (key !== mineKey) {
          mineKey = key;
          mineProgress = 0;
        }
        const hard = BLOCKS[blockAt(target.x, target.y, target.z)].hard;
        if (hard === Infinity) {
          if (now - protectedToast > 3000) {
            protectedToast = now;
            cb.onToast("That block belongs to the landmark. It stays.");
          }
        } else {
          mineProgress += dt / hard;
          digTimer -= dt;
          if (digTimer <= 0) {
            digTimer = 0.2;
            sfx.dig();
            swing = 1;
            burst(target.x, target.y, target.z, blockAt(target.x, target.y, target.z), 2);
          }
          if (mineProgress >= 1) {
            breakTarget();
            mineKey = -1;
            mineProgress = 0;
            raycast();
          }
        }
      } else {
        mineKey = -1;
        mineProgress = 0;
      }

      slowTimer -= dt;
      if (slowTimer <= 0) {
        slowTimer = 0.25;
        checkLandmarks();
        reveal();
        const px = player.x;
        const pz = player.z;
        const limit = fogFar + 26;
        for (let ci = 0; ci < chunkCount; ci++) {
          const cx = (ci % CHUNKS_X) * CHUNK + 8;
          const cz = Math.floor(ci / CHUNKS_X) * CHUNK + 8;
          const visible = Math.hypot(cx - px, cz - pz) < limit;
          const a = solidMeshes[ci];
          const b = waterMeshes[ci];
          if (a) a.visible = visible;
          if (b) b.visible = visible;
        }
        for (const mark of world.landmarks) {
          const sprite = labelSprites.get(mark.id);
          if (sprite) sprite.visible = Math.hypot(mark.x - px, mark.z - pz) < 90;
        }
      }
    }

    // camera
    camera.position.set(player.x, player.y + EYE, player.z);
    camera.rotation.set(player.pitch, player.yaw, 0);
    const targetFov = sprinting ? 80 : 72;
    if (Math.abs(camera.fov - targetFov) > 0.1) {
      camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 8);
      camera.updateProjectionMatrix();
    }
    const headBlock = blockAt(Math.floor(player.x), Math.floor(player.y + EYE), Math.floor(player.z));
    const under = headBlock === B.WATER;
    if (under !== underwater) {
      underwater = under;
      cb.onUnderwater(under);
    }
    updateSky(underwater);

    cloudDrift = (cloudDrift + dt * 1.1) % CLOUD_SPAN;
    clouds.position.x = Math.floor((player.x - cloudDrift) / CLOUD_SPAN) * CLOUD_SPAN + cloudDrift;
    clouds.position.z = Math.floor(player.z / CLOUD_SPAN) * CLOUD_SPAN;

    highlight.visible = target.hit && ready && !paused;
    if (highlight.visible) highlight.position.set(target.x + 0.5, target.y + 0.5, target.z + 0.5);
    crackMesh.visible = highlight.visible && mineProgress > 0.02;
    if (crackMesh.visible) {
      crackMesh.geometry = crackGeometries[Math.min(3, Math.floor(mineProgress * 4))];
      crackMesh.position.copy(highlight.position);
    }

    swing = Math.max(0, swing - dt * 5);
    const swingArc = Math.sin(swing * Math.PI);
    hand.rotation.set(-0.25 - swingArc * 0.9, 0.6, 0.1);
    hand.position.y = (camera.aspect < 1 ? -0.4 : -0.34) + Math.sin(bob) * 0.012 - swingArc * 0.08;

    for (let i = 0; i < DEBRIS; i++) {
      if (debrisLife[i] <= 0) continue;
      debrisLife[i] -= dt;
      debrisVelocity[i * 3 + 1] -= 16 * dt;
      debrisPositions[i * 3] += debrisVelocity[i * 3] * dt;
      debrisPositions[i * 3 + 1] += debrisVelocity[i * 3 + 1] * dt;
      debrisPositions[i * 3 + 2] += debrisVelocity[i * 3 + 2] * dt;
      if (debrisLife[i] <= 0) debrisPositions[i * 3 + 1] = -999;
    }
    debrisGeometry.attributes.position.needsUpdate = true;

    const seconds = now / 1000;
    for (let i = 0; i < MOTES; i++) {
      const sx = moteSeeds[i * 4];
      const sz = moteSeeds[i * 4 + 2];
      if (Math.abs(sx - player.x) > 26 || Math.abs(sz - player.z) > 26) placeMote(i);
      const phase = moteSeeds[i * 4 + 3] + seconds;
      motePositions[i * 3] = moteSeeds[i * 4] + Math.sin(phase * 0.7) * 1.6;
      motePositions[i * 3 + 1] = moteSeeds[i * 4 + 1] + Math.sin(phase * 1.9) * 0.5;
      motePositions[i * 3 + 2] = moteSeeds[i * 4 + 2] + Math.cos(phase * 0.5) * 1.6;
    }
    moteGeometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
    if (frame % 2 === 0) drawCompass();
  };

  // ---------------------------------------------------------- input
  const onKeyDown = (event: KeyboardEvent) => {
    const el = event.target as HTMLElement | null;
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
    if (paused) return;
    if (event.code.startsWith("Digit")) {
      const slot = Number(event.code.slice(5)) - 1;
      if (slot >= 0 && slot < ITEMS.length) selectSlot(slot);
      return;
    }
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) event.preventDefault();
    keys.add(event.code);
  };
  const onKeyUp = (event: KeyboardEvent) => keys.delete(event.code);
  const onBlur = () => {
    keys.clear();
    input.mining = false;
    save();
  };
  const onMouseMove = (event: MouseEvent) => {
    if (locked && !paused) addLook(event.movementX, event.movementY);
  };
  const onMouseDown = (event: MouseEvent) => {
    if (options.touch || paused) return;
    if (!locked) {
      lock();
      return;
    }
    sfx.resume();
    if (event.button === 0) input.mining = true;
    else if (event.button === 2) place();
  };
  const onMouseUp = (event: MouseEvent) => {
    if (event.button === 0) input.mining = false;
  };
  const onWheel = (event: WheelEvent) => {
    if (paused || !locked) return;
    selectSlot((selected + (event.deltaY > 0 ? 1 : ITEMS.length - 1)) % ITEMS.length);
  };
  const onLockChange = () => {
    locked = document.pointerLockElement === canvas;
    if (!locked) input.mining = false;
    cb.onLock(locked);
  };
  const onContext = (event: Event) => event.preventDefault();
  const onVisibility = () => {
    if (document.hidden) save();
  };

  const lock = () => {
    sfx.resume();
    if (options.touch || locked) return;
    try {
      const request = canvas.requestPointerLock() as unknown as Promise<void> | undefined;
      request?.catch?.(() => undefined);
    } catch {
      // pointer lock unavailable: keyboard movement still works
    }
  };
  const addLook = (dx: number, dy: number) => {
    player.yaw -= dx * 0.0026;
    player.pitch = clamp(player.pitch - dy * 0.0026, -1.5, 1.5);
  };
  const selectSlot = (slot: number) => {
    selected = slot;
    hand.geometry = handGeometries[slot];
    cb.onInventory([...inventory], selected);
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  window.addEventListener("resize", resize);
  window.addEventListener("mouseup", onMouseUp);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("pointerlockchange", onLockChange);
  document.addEventListener("visibilitychange", onVisibility);
  canvas.addEventListener("mousedown", onMouseDown);
  canvas.addEventListener("wheel", onWheel, { passive: true });
  canvas.addEventListener("contextmenu", onContext);

  // ---------------------------------------------------------- boot
  const boot = [
    () => {
      world = generateWorld(SEED, publicationCount);
      edits.forEach((block, at) => {
        if (at >= 0 && at < world!.blocks.length) world!.blocks[at] = block;
      });
      cb.onProgress(0.25);
    },
    () => {
      relight(world!, 0, 0, W - 1, D - 1);
      cb.onProgress(0.45);
    },
    () => {
      const w = world!;
      const [sx, sy, sz] = w.spawn;
      Object.assign(player, { x: sx, y: sy, z: sz, yaw: 0 });
      if (saved?.pos && saved.pos.length >= 4 && !collides(saved.pos[0], saved.pos[1], saved.pos[2])) {
        Object.assign(player, { x: saved.pos[0], y: saved.pos[1], z: saved.pos[2], yaw: saved.pos[3] });
      }
      buildLandmarks();
      for (let i = 0; i < MOTES; i++) placeMote(i);
      const order = Array.from({ length: chunkCount }, (_, ci) => ci);
      const distance = (ci: number) => Math.hypot((ci % CHUNKS_X) * CHUNK + 8 - player.x, Math.floor(ci / CHUNKS_X) * CHUNK + 8 - player.z);
      order.sort((a, b) => distance(a) - distance(b));
      pending = order;
      const needed = order.filter((ci) => distance(ci) < fogFar + 20).length;
      const total = order.length;
      const wait = () => {
        if (disposed) return;
        const done = total - pending.length;
        if (done >= needed) {
          ready = true;
          cb.onProgress(1);
          cb.onInventory([...inventory], selected);
          cb.onCrystals(collected.length, w.crystals.length);
          discovered.forEach((id) => cb.onDiscover(id, [...discovered], false));
          cb.onReady();
          return;
        }
        cb.onProgress(0.45 + 0.55 * (done / needed));
        window.setTimeout(wait, 60);
      };
      wait();
    },
  ];
  const runBoot = (step: number) => {
    if (disposed || step >= boot.length) return;
    boot[step]();
    window.setTimeout(() => runBoot(step + 1), 30);
  };
  resize();
  cb.onProgress(0.05);
  window.setTimeout(() => runBoot(0), 30);
  raf = requestAnimationFrame(tick);

  const handle: ExploreHandle = {
    get landmarks() {
      return world?.landmarks ?? [];
    },
    icons: ITEMS.map((item) => blockIcon(atlasCanvas, item)),
    itemNames: ITEMS.map((item) => BLOCKS[item].name),
    setMove: (x, y) => {
      input.mx = x;
      input.my = y;
    },
    addLook,
    setJump: (held) => {
      input.jump = held;
    },
    setMining: (held) => {
      sfx.resume();
      input.mining = held;
    },
    place,
    selectSlot,
    setPaused: (next) => {
      paused = next;
      if (next) {
        keys.clear();
        input.mining = false;
        input.jump = false;
        input.mx = input.my = 0;
      } else sfx.resume();
    },
    travel: (id) => {
      const mark = world?.landmarks.find((item) => item.id === id);
      if (!mark) return;
      Object.assign(player, { x: mark.home[0], y: mark.home[1] + 0.05, z: mark.home[2], vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0.05 });
      sfx.travel();
      slowTimer = 0;
      saveSoon();
    },
    drawMap,
    setMuted: (muted) => sfx.setMuted(muted),
    resetWorld: () => {
      try {
        window.localStorage.removeItem(SAVE_KEY);
      } catch {
        // nothing stored
      }
      ready = false;
      window.location.reload();
    },
    lock,
    dispose: () => {
      save();
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(saveTimer);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onLockChange);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("contextmenu", onContext);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      sfx.dispose();
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose?.();
      });
      atlas.dispose();
      atlasSrgb.dispose();
      renderer.dispose();
    },
  };

  if (options.debug) {
    (window as unknown as Record<string, unknown>).__explore = {
      player,
      handle,
      get world() {
        return world;
      },
      setTime: (value: number) => {
        time = value;
      },
      setBlock,
      inventory,
      revealAll: () => explored.fill(1),
      input,
      info: renderer.info,
    };
  }

  return handle;
}
