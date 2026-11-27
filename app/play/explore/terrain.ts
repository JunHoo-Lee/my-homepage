// World generation: an island heightmap, biomes, landmark sites joined by
// walkable trails, voxel structures, and the two light channels (sky + block).

import { B, EMIT, OPAQUE } from "./atlas";

export const W = 224;
export const D = 224;
export const H = 64;
export const SEA = 18;
export const CHUNK = 16;
export const CHUNKS_X = W / CHUNK;
export const CHUNKS_Z = D / CHUNK;
const AREA = W * D;

export type LandmarkKind = "about" | "links" | "news" | "pub" | "posts" | "education" | "awards";

export type Landmark = {
  id: string;
  kind: LandmarkKind;
  /** publication index for `pub`, otherwise 0 */
  index: number;
  x: number;
  y: number;
  z: number;
  color: string;
  /** where fast travel drops the player */
  home: [number, number, number];
};

export type World = {
  blocks: Uint8Array;
  sky: Uint8Array;
  blk: Uint8Array;
  /** highest non-air block per column */
  top: Uint8Array;
  landmarks: Landmark[];
  /** block indices of the hidden crystals */
  crystals: number[];
  spawn: [number, number, number];
};

export const idx = (x: number, y: number, z: number) => (y * D + z) * W + x;
export const inWorld = (x: number, y: number, z: number) => x >= 0 && x < W && z >= 0 && z < D && y >= 0 && y < H;

// ------------------------------------------------------------ noise

function makeNoise(seed: number) {
  const lattice = (i: number, j: number) => {
    let n = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + seed) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  const noise = (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = x - xi;
    const fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const a = lattice(xi, yi);
    const b = lattice(xi + 1, yi);
    const c = lattice(xi, yi + 1);
    const d = lattice(xi + 1, yi + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
  return (x: number, y: number, octaves: number) => {
    let sum = 0;
    let amp = 0.5;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += noise(x, y) * amp;
      norm += amp;
      amp *= 0.5;
      x *= 2.03;
      y *= 2.03;
    }
    return sum / norm;
  };
}

const hash = (x: number, z: number, salt = 0) => {
  let n = (Math.imul(x, 73856093) ^ Math.imul(z, 19349663) ^ Math.imul(salt + 1, 83492791)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};

const smooth = (a: number, b: number, v: number) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// ------------------------------------------------------------ generation

const BIOME = { BEACH: 0, MEADOW: 1, FOREST: 2, AUTUMN: 3, DESERT: 4, COLD: 5, ROCK: 6, SNOW: 7 } as const;
const SURF = { NATURAL: 0, PATH: 1, PLAZA: 2, BRIDGE: 3, LAWN: 4 } as const;

type Site = { kind: LandmarkKind; index: number; x: number; z: number; h: number; r: number };

const COLORS: Record<LandmarkKind, string> = {
  about: "#ffd27a",
  links: "#b48bff",
  news: "#ff9f6b",
  pub: "#7df3ff",
  posts: "#fff0a8",
  education: "#9be3a8",
  awards: "#ffd84a",
};

export function generateWorld(seed: number, publicationCount: number): World {
  const blocks = new Uint8Array(AREA * H);
  const height = new Uint8Array(AREA);
  const biome = new Uint8Array(AREA);
  const surf = new Uint8Array(AREA);
  const deck = new Uint8Array(AREA);
  const reserved = new Uint8Array(AREA);
  const col = (x: number, z: number) => z * W + x;

  const nBase = makeNoise(seed + 1);
  const nMountain = makeNoise(seed + 2);
  const nRidge = makeNoise(seed + 3);
  const nDetail = makeNoise(seed + 4);
  const nLake = makeNoise(seed + 5);
  const nTemp = makeNoise(seed + 6);
  const nMoist = makeNoise(seed + 7);
  const nWarp = makeNoise(seed + 8);

  // ---- heightmap
  for (let z = 0; z < D; z++) {
    for (let x = 0; x < W; x++) {
      const cx = (x - W / 2) / (W / 2);
      const cz = (z - D / 2) / (D / 2);
      const radial = Math.hypot(cx, cz);
      const d = radial + (nWarp(x / 50, z / 50, 3) - 0.5) * 0.4;
      const base = nBase(x / 70, z / 70, 4);
      const mountain = smooth(0.5, 0.7, nMountain(x / 90 + 10, z / 90 + 10, 3));
      const ridge = 1 - Math.abs(nRidge(x / 46, z / 46, 3) * 2 - 1);
      const lake = smooth(0.36, 0.26, nLake(x / 44, z / 44, 2)) * (1 - mountain);
      let h = SEA + 2 + base * 9 + mountain * (9 + ridge * 19) + (nDetail(x / 13, z / 13, 2) - 0.5) * 2.6 - lake * 7;
      h += 4 * Math.exp(-((radial * 5) ** 2));
      const land = 1 - smooth(0.6, 0.94, d);
      h = SEA - 9 + (h - (SEA - 9)) * land;
      height[col(x, z)] = Math.max(2, Math.min(H - 8, Math.round(h)));
    }
  }
  const hAt = (x: number, z: number) => height[col(Math.max(0, Math.min(W - 1, x)), Math.max(0, Math.min(D - 1, z)))];

  // ---- landmark sites
  const sites: Site[] = [];
  const flatness = (x: number, z: number, r: number) => {
    let lo = 255;
    let hi = 0;
    for (let dz = -r; dz <= r; dz += 2) {
      for (let dx = -r; dx <= r; dx += 2) {
        const h = hAt(x + dx, z + dz);
        if (h < lo) lo = h;
        if (h > hi) hi = h;
      }
    }
    return hi - lo;
  };
  const nearestSite = (x: number, z: number) => {
    let best = Infinity;
    for (const site of sites) best = Math.min(best, Math.hypot(site.x - x, site.z - z));
    return best;
  };
  const pick = (kind: LandmarkKind, index: number, r: number, minDist: number, score: (x: number, z: number, h: number) => number) => {
    for (let relax = 1; relax > 0.2; relax *= 0.8) {
      let best = -Infinity;
      let bx = -1;
      let bz = -1;
      for (let z = 16; z < D - 16; z += 3) {
        for (let x = 16; x < W - 16; x += 3) {
          if (nearestSite(x, z) < minDist * relax) continue;
          const s = score(x, z, height[col(x, z)]);
          if (s > best) {
            best = s;
            bx = x;
            bz = z;
          }
        }
      }
      if (bx >= 0 && best > -Infinity) {
        const site: Site = { kind, index, x: bx, z: bz, h: height[col(bx, bz)], r };
        sites.push(site);
        return site;
      }
    }
    return null;
  };
  const NO = -Infinity;
  const fromCentre = (x: number, z: number) => Math.hypot(x - W / 2, z - D / 2);

  const camp = pick("about", 0, 8, 0, (x, z, h) => (h < SEA + 2 || h > SEA + 14 ? NO : -fromCentre(x, z) - flatness(x, z, 8) * 4))!;
  const campDist = (x: number, z: number) => Math.hypot(x - camp.x, z - camp.z);
  pick("links", 0, 4, 12, (x, z, h) => {
    const d = campDist(x, z);
    return h < SEA + 2 || d < 14 || d > 22 ? NO : -flatness(x, z, 4) * 3 - Math.abs(h - camp.h) + hash(x, z, 1);
  });
  pick("news", 0, 3, 12, (x, z, h) => {
    const d = campDist(x, z);
    return h < SEA + 2 || d < 14 || d > 24 ? NO : -flatness(x, z, 3) * 3 - Math.abs(h - camp.h) + hash(x, z, 2);
  });
  const summit = pick("awards", 0, 4, 40, (_x, _z, h) => h);
  if (summit) summit.h -= 2;
  pick("posts", 0, 5, 40, (x, z, h) => {
    if (h < SEA + 1 || h > SEA + 4) return NO;
    let water = 0;
    for (let a = 0; a < 8; a++) {
      if (hAt(Math.round(x + Math.cos(a * 0.785) * 9), Math.round(z + Math.sin(a * 0.785) * 9)) < SEA) water++;
    }
    return water < 3 ? NO : water + fromCentre(x, z) * 0.12 + hash(x, z, 3);
  });
  pick("education", 0, 8, 38, (x, z, h) =>
    h < SEA + 4 || h > SEA + 20 ? NO : -flatness(x, z, 8) * 2 + hash(x, z, 4) * 6 + Math.min(60, campDist(x, z)) * 0.05,
  );
  for (let i = 0; i < publicationCount; i++) {
    pick("pub", i, 4, 34, (x, z, h) => (h < SEA + 2 || h > 50 ? NO : hash(x, z, 10 + i) * 12 - flatness(x, z, 4) * 1.5));
  }

  // ---- flatten the sites
  for (const site of sites) {
    if (site.kind === "posts") site.h = Math.max(site.h, SEA + 2);
    const reach = site.r + 4;
    for (let dz = -reach; dz <= reach; dz++) {
      for (let dx = -reach; dx <= reach; dx++) {
        const x = site.x + dx;
        const z = site.z + dz;
        if (x < 1 || z < 1 || x >= W - 1 || z >= D - 1) continue;
        const d = Math.max(Math.abs(dx), Math.abs(dz));
        const c = col(x, z);
        if (d <= site.r) {
          height[c] = site.h;
          surf[c] = site.kind === "about" ? SURF.LAWN : SURF.PLAZA;
          reserved[c] = 2;
        } else {
          const t = (d - site.r) / 4;
          height[c] = Math.round(site.h + (height[c] - site.h) * t * t);
          if (d <= site.r + 2) reserved[c] = Math.max(reserved[c], 1);
        }
      }
    }
  }

  // ---- trails: a minimum spanning tree over the sites, slope-limited so every
  // landmark can be reached on foot
  const linked = new Set<Site>([camp]);
  const edges: [Site, Site][] = [];
  while (linked.size < sites.length) {
    let best: [Site, Site] | null = null;
    let bestDist = Infinity;
    for (const a of linked) {
      for (const b of sites) {
        if (linked.has(b)) continue;
        const d = Math.hypot(a.x - b.x, a.z - b.z);
        if (d < bestDist) {
          bestDist = d;
          best = [a, b];
        }
      }
    }
    if (!best) break;
    linked.add(best[1]);
    edges.push(best);
  }

  edges.forEach(([a, b], edgeIndex) => {
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    const segments = Math.max(2, Math.ceil(length / 9));
    const px = -(b.z - a.z) / length;
    const pz = (b.x - a.x) / length;
    const amp = Math.min(9, length * 0.16);
    const cells: [number, number][] = [[a.x, a.z]];
    let x = a.x;
    let z = a.z;
    for (let s = 1; s <= segments; s++) {
      const t = s / segments;
      const sway = Math.sin(Math.PI * t) * amp * (nDetail(t * 3 + edgeIndex * 7.3, edgeIndex * 1.7, 2) - 0.5) * 2.4;
      const tx = Math.max(3, Math.min(W - 4, Math.round(a.x + (b.x - a.x) * t + px * sway)));
      const tz = Math.max(3, Math.min(D - 4, Math.round(a.z + (b.z - a.z) * t + pz * sway)));
      const dx = Math.abs(tx - x);
      const dz = Math.abs(tz - z);
      const sx = tx > x ? 1 : -1;
      const sz = tz > z ? 1 : -1;
      let err = dx - dz;
      while (x !== tx || z !== tz) {
        const e2 = err * 2;
        if (e2 > -dz) {
          err -= dz;
          x += sx;
          cells.push([x, z]);
        }
        if (e2 < dx) {
          err += dx;
          z += sz;
          cells.push([x, z]);
        }
      }
    }
    const n = cells.length;
    const profile = new Float32Array(n);
    for (let i = 0; i < n; i++) profile[i] = Math.max(height[col(cells[i][0], cells[i][1])], SEA + 1);
    profile[0] = a.h;
    for (let i = 1; i < n; i++) profile[i] = Math.max(profile[i - 1] - 1, Math.min(profile[i - 1] + 1, profile[i]));
    profile[n - 1] = b.h;
    for (let i = n - 2; i >= 0; i--) profile[i] = Math.max(profile[i + 1] - 1, Math.min(profile[i + 1] + 1, profile[i]));

    const lay = (cx: number, cz: number, level: number, centre: boolean) => {
      if (cx < 1 || cz < 1 || cx >= W - 1 || cz >= D - 1) return;
      const c = col(cx, cz);
      if (reserved[c] === 2) return;
      if (!centre && (surf[c] === SURF.PATH || surf[c] === SURF.BRIDGE)) return;
      if (height[c] < SEA && level <= SEA + 2) {
        surf[c] = SURF.BRIDGE;
        deck[c] = level;
      } else {
        surf[c] = SURF.PATH;
        height[c] = level;
      }
      reserved[c] = Math.max(reserved[c], 1);
    };
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < n; i++) {
        const [cx, cz] = cells[i];
        if (pass === 0) {
          lay(cx + 1, cz, profile[i], false);
          lay(cx - 1, cz, profile[i], false);
          lay(cx, cz + 1, profile[i], false);
          lay(cx, cz - 1, profile[i], false);
        } else {
          lay(cx, cz, profile[i], true);
        }
      }
    }
  });

  // ---- biomes and voxel fill
  for (let z = 0; z < D; z++) {
    for (let x = 0; x < W; x++) {
      const c = col(x, z);
      const h = height[c];
      const temp = nTemp(x / 110, z / 110, 2) - Math.max(0, h - SEA - 6) / 70;
      const moist = nMoist(x / 80, z / 80, 2);
      const slope = Math.max(Math.abs(h - hAt(x + 1, z)), Math.abs(h - hAt(x - 1, z)), Math.abs(h - hAt(x, z + 1)), Math.abs(h - hAt(x, z - 1)));
      let b: number = BIOME.MEADOW;
      if (h <= SEA + 1) b = BIOME.BEACH;
      else if (h >= 45) b = BIOME.SNOW;
      else if (h >= 38 || (slope >= 3 && h > SEA + 7)) b = BIOME.ROCK;
      else if (temp > 0.56 && moist < 0.47) b = BIOME.DESERT;
      else if (temp < 0.37) b = BIOME.COLD;
      else if (moist > 0.56) b = BIOME.FOREST;
      else if (moist > 0.47 && temp < 0.5) b = BIOME.AUTUMN;
      biome[c] = b;

      let topBlock: number = B.GRASS;
      let under: number = B.DIRT;
      if (b === BIOME.BEACH || b === BIOME.DESERT) topBlock = under = B.SAND;
      else if (b === BIOME.ROCK) topBlock = under = B.STONE;
      else if (b === BIOME.SNOW) {
        topBlock = B.SNOW;
        under = B.STONE;
      } else if (b === BIOME.COLD) topBlock = B.SNOWGRASS;
      if (surf[c] === SURF.PATH) topBlock = B.PATH;
      else if (surf[c] === SURF.PLAZA) topBlock = hash(x, z, 5) > 0.3 ? B.COBBLE : B.PATH;
      else if (surf[c] === SURF.LAWN) topBlock = B.GRASS;

      blocks[idx(x, 0, z)] = B.BEDROCK;
      for (let y = 1; y <= h; y++) blocks[idx(x, y, z)] = y === h ? topBlock : y >= h - 3 ? under : B.STONE;
      for (let y = h + 1; y <= SEA; y++) blocks[idx(x, y, z)] = B.WATER;
      if (surf[c] === SURF.BRIDGE) {
        blocks[idx(x, deck[c], z)] = B.PLANKS;
        if (x % 4 === 0 && z % 4 === 0) for (let y = h + 1; y < deck[c]; y++) blocks[idx(x, y, z)] = B.LOG;
      }
    }
  }

  const set = (x: number, y: number, z: number, id: number) => {
    if (inWorld(x, y, z) && y > 0) blocks[idx(x, y, z)] = id;
  };
  const soft = (x: number, y: number, z: number, id: number) => {
    if (inWorld(x, y, z) && blocks[idx(x, y, z)] === B.AIR) blocks[idx(x, y, z)] = id;
  };
  const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, id: number) => {
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) set(x, y, z, id);
  };

  // ---- vegetation
  const blob = (x: number, y: number, z: number, r: number, id: number, salt: number) => {
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) === r && Math.abs(dz) === r && (r > 1 || hash(x + dx, z + dz, salt + y) > 0.5)) continue;
        soft(x + dx, y, z + dz, id);
      }
    }
  };
  for (let z = 3; z < D - 3; z++) {
    for (let x = 3; x < W - 3; x++) {
      const c = col(x, z);
      if (reserved[c] || surf[c] !== SURF.NATURAL) continue;
      const h = height[c];
      if (h < SEA + 1) continue;
      const b = biome[c];
      const v = hash(x, z, 20);
      const density = b === BIOME.FOREST ? 0.3 : b === BIOME.AUTUMN ? 0.2 : b === BIOME.COLD ? 0.14 : b === BIOME.MEADOW ? 0.035 : b === BIOME.DESERT ? 0.03 : 0;
      let isPeak = v < density;
      for (let dz = -2; dz <= 2 && isPeak; dz++) {
        for (let dx = -2; dx <= 2; dx++) {
          if ((dx || dz) && hash(x + dx, z + dz, 20) < v) {
            isPeak = false;
            break;
          }
        }
      }
      const y0 = h + 1;
      if (isPeak) {
        const size = hash(x, z, 21);
        if (b === BIOME.DESERT) {
          for (let y = 0; y < 2 + Math.floor(size * 3); y++) set(x, y0 + y, z, B.CACTUS);
        } else if (b === BIOME.COLD) {
          const trunk = 6 + Math.floor(size * 3);
          for (let y = 0; y < trunk; y++) set(x, y0 + y, z, B.LOG);
          for (let y = 2; y <= trunk; y++) blob(x, y0 + y, z, y === trunk ? 0 : (trunk - y) % 2 === 1 ? 2 : 1, B.PINE, 3);
          soft(x, y0 + trunk + 1, z, B.PINE);
        } else {
          const autumn = b === BIOME.AUTUMN || (b === BIOME.MEADOW && size > 0.8);
          const trunk = 4 + Math.floor(size * 3);
          for (let y = 0; y < trunk; y++) set(x, y0 + y, z, autumn ? B.BIRCH : B.LOG);
          const leaf = autumn ? B.AUTUMN : B.LEAVES;
          blob(x, y0 + trunk - 2, z, 2, leaf, 1);
          blob(x, y0 + trunk - 1, z, 2, leaf, 2);
          blob(x, y0 + trunk, z, 1, leaf, 3);
          blob(x, y0 + trunk + 1, z, 1, leaf, 4);
        }
        continue;
      }
      const p = hash(x, z, 22);
      const top = blocks[idx(x, h, z)];
      if (top === B.GRASS) {
        const lush = b === BIOME.MEADOW ? 1 : 0.5;
        if (p < 0.02 * lush) set(x, y0, z, B.FLOWER_R);
        else if (p < 0.04 * lush) set(x, y0, z, B.FLOWER_Y);
        else if (p < 0.055 * lush) set(x, y0, z, B.FLOWER_B);
        else if (p < 0.2 * lush) set(x, y0, z, B.TALLGRASS);
      }
    }
  }

  // ---- structures
  const landmarks: Landmark[] = [];
  let pubStyle = 0;
  for (const site of sites) {
    const { x, z } = site;
    const g = site.h;
    const y = g + 1;
    const id = site.kind === "pub" ? `pub:${site.index}` : site.kind;
    let labelY = y + 6;
    // clear whatever the blend left above the plaza
    box(x - site.r, y, z - site.r, x + site.r, Math.min(H - 1, y + 12), z + site.r, B.AIR);

    if (site.kind === "about") {
      const cz = z - 4;
      box(x - 3, g, cz - 3, x + 3, g, cz + 2, B.PLANKS);
      box(x - 3, y, cz - 3, x + 3, y + 2, cz + 2, B.PLANKS);
      box(x - 2, y, cz - 2, x + 2, y + 2, cz + 1, B.AIR);
      for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 2], [3, 2]]) box(x + dx, y, cz + dz, x + dx, y + 2, cz + dz, B.LOG);
      box(x, y, cz + 2, x, y + 1, cz + 2, B.AIR); // door
      set(x - 3, y + 1, cz, B.GLASS);
      set(x + 3, y + 1, cz - 1, B.GLASS);
      set(x + 3, y + 1, cz, B.GLASS);
      set(x - 2, y + 1, cz + 2, B.GLASS);
      set(x + 2, y + 1, cz + 2, B.GLASS);
      for (let k = 0; k < 4; k++) {
        box(x - 4, y + 3 + k, cz - 4 + k, x + 4, y + 3 + k, cz + 3 - k, B.ROOF);
        if (k > 0) {
          box(x - 3, y + 2 + k, cz - 4 + k, x - 3, y + 2 + k, cz + 3 - k, B.PLANKS);
          box(x + 3, y + 2 + k, cz - 4 + k, x + 3, y + 2 + k, cz + 3 - k, B.PLANKS);
          box(x - 2, y + 2 + k, cz - 4 + k + 1, x + 2, y + 2 + k, cz + 3 - k - 1, B.AIR);
        }
      }
      box(x - 2, y, cz - 2, x - 1, y + 1, cz - 2, B.BOOKS);
      set(x + 2, y, cz - 2, B.PLANKS);
      set(x + 2, y + 1, cz - 2, B.LANTERN);
      // campfire, benches, flag
      box(x + 3, g, z + 2, x + 5, g, z + 4, B.COBBLE);
      set(x + 4, y, z + 3, B.LANTERN);
      box(x + 2, y, z + 5, x + 3, y, z + 5, B.LOG);
      set(x + 6, y, z + 2, B.LOG);
      box(x - 5, y, z + 2, x - 5, y + 6, z + 2, B.LOG);
      box(x - 4, y + 5, z + 2, x - 3, y + 6, z + 2, B.ROOF);
      labelY = y + 9;
    } else if (site.kind === "links") {
      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = 0; dy <= 4; dy++) set(x + dx, y + dy, z, Math.abs(dx) === 2 || dy === 0 || dy === 4 ? B.SHRINE : B.PORTAL);
      }
      set(x - 2, y + 5, z, B.LANTERN);
      set(x + 2, y + 5, z, B.LANTERN);
      labelY = y + 8;
    } else if (site.kind === "news") {
      box(x - 2, y, z, x - 2, y + 3, z, B.LOG);
      box(x + 2, y, z, x + 2, y + 3, z, B.LOG);
      box(x - 1, y + 1, z, x + 1, y + 2, z, B.BOOKS);
      box(x - 3, y + 4, z - 1, x + 3, y + 4, z + 1, B.ROOF);
      set(x, y + 5, z, B.LANTERN);
      labelY = y + 8;
    } else if (site.kind === "pub") {
      const style = pubStyle++ % 3;
      const pillar = style === 0 ? B.COBBLE : style === 1 ? B.MARBLE : B.LOG;
      box(x - 3, g, z - 3, x + 3, g, z + 3, B.SHRINE);
      box(x - 2, g, z - 2, x + 2, g, z + 2, style === 1 ? B.MARBLE : B.COBBLE);
      for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) {
        box(x + dx, y, z + dz, x + dx, y + 3, z + dz, pillar);
        set(x + dx, y + 4, z + dz, B.LANTERN);
      }
      if (style === 1) {
        box(x - 3, y + 5, z - 3, x + 3, y + 5, z + 3, B.MARBLE);
        box(x - 2, y + 5, z - 2, x + 2, y + 5, z + 2, B.AIR);
      } else if (style === 2) {
        box(x - 4, y + 5, z - 4, x + 4, y + 5, z + 4, B.ROOF);
        box(x - 2, y + 5, z - 2, x + 2, y + 5, z + 2, B.AIR);
        box(x - 3, y + 6, z - 3, x + 3, y + 6, z + 3, B.ROOF);
        box(x - 1, y + 6, z - 1, x + 1, y + 6, z + 1, B.AIR);
      }
      set(x, y, z, style === 1 ? B.SHRINE : B.MARBLE);
      set(x, y + 1, z, B.RUNE);
      labelY = y + 9;
    } else if (site.kind === "posts") {
      const disc = (yy: number, r: number, block: number, hollow: number) => {
        for (let dz = -4; dz <= 4; dz++) {
          for (let dx = -4; dx <= 4; dx++) {
            const d = Math.hypot(dx, dz);
            if (d <= r && d > hollow) set(x + dx, yy, z + dz, block);
          }
        }
      };
      disc(g, 3.6, B.COBBLE, -1);
      for (let k = 0; k < 13; k++) disc(y + k, 2.6, k % 5 >= 3 ? B.ROOF : B.MARBLE, 1.6);
      box(x, y, z + 2, x, y + 1, z + 2, B.AIR);
      set(x, y, z, B.LANTERN);
      disc(y + 13, 3.7, B.COBBLE, -1);
      disc(y + 14, 1.6, B.GLASS, -1);
      disc(y + 15, 1.6, B.GLASS, -1);
      set(x, y + 14, z, B.LANTERN);
      set(x, y + 15, z, B.LANTERN);
      disc(y + 16, 2.6, B.ROOF, -1);
      disc(y + 17, 1.6, B.ROOF, -1);
      set(x, y + 18, z, B.GOLD);
      labelY = y + 21;
    } else if (site.kind === "education") {
      box(x - 6, g, z - 4, x + 6, g, z + 4, B.MARBLE);
      box(x - 6, y, z - 4, x + 6, y + 4, z - 4, B.MARBLE);
      box(x - 6, y, z - 4, x - 6, y + 4, z + 1, B.MARBLE);
      box(x + 6, y, z - 4, x + 6, y + 4, z + 1, B.MARBLE);
      box(x - 5, y, z - 3, x + 5, y + 3, z - 3, B.BOOKS);
      for (const dx of [-6, -3, 0, 3, 6]) box(x + dx, y, z + 4, x + dx, y + 4, z + 4, B.MARBLE);
      box(x - 7, y + 5, z - 5, x + 7, y + 5, z + 5, B.MARBLE);
      box(x - 5, y + 6, z - 3, x + 5, y + 6, z + 3, B.ROOF);
      set(x - 3, y + 4, z + 1, B.LANTERN);
      set(x + 3, y + 4, z + 1, B.LANTERN);
      set(x, y + 4, z - 2, B.LANTERN);
      labelY = y + 10;
    } else {
      box(x - 2, y, z - 2, x + 2, y, z + 2, B.COBBLE);
      box(x - 1, y + 1, z - 1, x + 1, y + 1, z + 1, B.GOLD);
      set(x, y + 2, z, B.GOLD);
      for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) set(x + dx, y + 1, z + dz, B.LANTERN);
      box(x, y + 3, z, x, y + 7, z, B.LOG);
      box(x + 1, y + 6, z, x + 3, y + 7, z, B.ROOF);
      labelY = y + 10;
    }
    const away = site.kind === "posts" ? 4.5 : site.kind === "awards" ? 3.5 : 2.5;
    landmarks.push({ id, kind: site.kind, index: site.index, x: x + 0.5, y: labelY, z: z + 0.5, color: COLORS[site.kind], home: [x + 0.5, y, z + away] });
  }

  // ---- hidden crystals
  const crystals: number[] = [];
  const spots: [number, number][] = [];
  const candidates: [number, number, number][] = [];
  for (let z = 10; z < D - 10; z += 2) {
    for (let x = 10; x < W - 10; x += 2) {
      const c = col(x, z);
      if (reserved[c] || surf[c] !== SURF.NATURAL || height[c] < SEA - 3) continue;
      if (blocks[idx(x, height[c] + 1, z)] !== B.AIR && blocks[idx(x, height[c] + 1, z)] !== B.WATER) continue;
      if (nearestSite(x, z) < 12) continue;
      candidates.push([hash(x, z, 30), x, z]);
    }
  }
  candidates.sort((a, b) => a[0] - b[0]);
  for (const [, x, z] of candidates) {
    if (crystals.length >= 24) break;
    if (spots.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 24)) continue;
    spots.push([x, z]);
    const at = idx(x, height[col(x, z)] + 1, z);
    blocks[at] = B.CRYSTAL;
    crystals.push(at);
  }

  const world: World = {
    blocks,
    sky: new Uint8Array(AREA * H),
    blk: new Uint8Array(AREA * H),
    top: new Uint8Array(AREA),
    landmarks,
    crystals,
    spawn: [camp.x + 0.5, camp.h + 1, camp.z + 2.5],
  };
  return world;
}

// ------------------------------------------------------------ light

const queue: number[] = [];

function flood(world: World, channel: Uint8Array, x0: number, z0: number, x1: number, z1: number) {
  const { blocks } = world;
  let head = 0;
  const spread = (x: number, y: number, z: number, level: number) => {
    if (x < x0 || x > x1 || z < z0 || z > z1 || y < 0 || y >= H) return;
    const j = idx(x, y, z);
    const b = blocks[j];
    if (OPAQUE[b]) return;
    const next = level - (b === B.WATER ? 2 : 1);
    if (channel[j] < next) {
      channel[j] = next;
      queue.push(j);
    }
  };
  while (head < queue.length) {
    const i = queue[head++];
    const level = channel[i];
    if (level <= 1) continue;
    const x = i % W;
    const z = Math.floor(i / W) % D;
    const y = Math.floor(i / AREA);
    spread(x + 1, y, z, level);
    spread(x - 1, y, z, level);
    spread(x, y, z + 1, level);
    spread(x, y, z - 1, level);
    spread(x, y + 1, z, level);
    spread(x, y - 1, z, level);
  }
  queue.length = 0;
}

/** Recomputes both light channels inside the (inclusive, clipped) column box. */
export function relight(world: World, x0: number, z0: number, x1: number, z1: number) {
  const { blocks, sky, blk, top } = world;
  x0 = Math.max(0, x0);
  z0 = Math.max(0, z0);
  x1 = Math.min(W - 1, x1);
  z1 = Math.min(D - 1, z1);
  const emitters: number[] = [];

  for (let z = z0; z <= z1; z++) {
    for (let x = x0; x <= x1; x++) {
      let level = 15;
      let highest = 0;
      for (let y = H - 1; y >= 0; y--) {
        const i = idx(x, y, z);
        const b = blocks[i];
        if (b !== B.AIR && !highest) highest = y;
        if (OPAQUE[b]) level = 0;
        else if (b === B.WATER) level = Math.max(0, level - 2);
        sky[i] = level;
        blk[i] = EMIT[b];
        if (EMIT[b]) emitters.push(i);
      }
      top[z * W + x] = highest;
    }
  }

  const ring = (channel: Uint8Array) => {
    for (let y = 0; y < H; y++) {
      for (let x = x0 - 1; x <= x1 + 1; x++) {
        for (const z of [z0 - 1, z1 + 1]) if (x >= 0 && x < W && z >= 0 && z < D && channel[idx(x, y, z)] > 1) queue.push(idx(x, y, z));
      }
      for (let z = z0; z <= z1; z++) {
        for (const x of [x0 - 1, x1 + 1]) if (x >= 0 && x < W && channel[idx(x, y, z)] > 1) queue.push(idx(x, y, z));
      }
    }
  };

  // sky: seed with lit cells that sit beside something taller than themselves
  for (let z = z0; z <= z1; z++) {
    for (let x = x0; x <= x1; x++) {
      const limit = Math.max(
        top[z * W + x],
        x > 0 ? top[z * W + x - 1] : 0,
        x < W - 1 ? top[z * W + x + 1] : 0,
        z > 0 ? top[(z - 1) * W + x] : 0,
        z < D - 1 ? top[(z + 1) * W + x] : 0,
      );
      for (let y = Math.min(H - 1, limit + 1); y >= 0; y--) {
        const i = idx(x, y, z);
        if (sky[i] > 1) queue.push(i);
      }
    }
  }
  ring(sky);
  flood(world, sky, x0, z0, x1, z1);

  for (const i of emitters) queue.push(i);
  ring(blk);
  flood(world, blk, x0, z0, x1, z1);
}
