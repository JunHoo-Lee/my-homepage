// Turns one 16x16 column of the world into two meshes (solid + water) with
// baked ambient occlusion and smooth sky/block light per vertex.

import { B, BLOCKS, CROSS, EMIT, OPAQUE, tileUV } from "./atlas";
import { CHUNK, D, H, W, idx, type World } from "./terrain";

export type MeshData = { position: Float32Array; uv: Float32Array; shade: Uint8Array; index: Uint32Array };

const LIGHT = new Uint8Array(16);
for (let level = 0; level < 16; level++) LIGHT[level] = Math.round(255 * Math.max(0.035, Math.pow(0.8, 15 - level)));

const AO = [0.48, 0.66, 0.84, 1];

// [normal, corners (counter-clockwise from outside), directional shade]
const FACES: { n: [number, number, number]; c: [number, number, number][]; s: number; tile: 0 | 1 | 2 }[] = [
  { n: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], s: 0.82, tile: 1 },
  { n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], s: 0.82, tile: 1 },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], s: 1, tile: 0 },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], s: 0.55, tile: 2 },
  { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], s: 0.68, tile: 1 },
  { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], s: 0.68, tile: 1 },
];
const CORNER_UV = [[0, 0], [1, 0], [1, 1], [0, 1]];

const UV: [number, number, number, number][] = [];
for (let tile = 0; tile < 64; tile++) UV.push(tileUV(tile));

class Builder {
  position = new Float32Array(4096 * 3);
  uv = new Float32Array(4096 * 2);
  shade = new Uint8Array(4096 * 3);
  index = new Uint32Array(4096 * 1.5);
  verts = 0;
  indices = 0;

  reset() {
    this.verts = 0;
    this.indices = 0;
  }

  private grow() {
    const grown = <T extends Float32Array | Uint8Array | Uint32Array>(source: T): T => {
      const next = new (source.constructor as new (n: number) => T)(source.length * 2);
      next.set(source);
      return next;
    };
    this.position = grown(this.position);
    this.uv = grown(this.uv);
    this.shade = grown(this.shade);
    this.index = grown(this.index);
  }

  vertex(x: number, y: number, z: number, u: number, v: number, sky: number, block: number, shade: number) {
    if ((this.verts + 1) * 3 > this.position.length) this.grow();
    const i = this.verts++;
    this.position[i * 3] = x;
    this.position[i * 3 + 1] = y;
    this.position[i * 3 + 2] = z;
    this.uv[i * 2] = u;
    this.uv[i * 2 + 1] = v;
    this.shade[i * 3] = sky;
    this.shade[i * 3 + 1] = block;
    this.shade[i * 3 + 2] = shade;
  }

  quad(flip: boolean) {
    if (this.indices + 6 > this.index.length) this.grow();
    const a = this.verts - 4;
    const order = flip ? [1, 2, 3, 1, 3, 0] : [0, 1, 2, 0, 2, 3];
    for (const o of order) this.index[this.indices++] = a + o;
  }

  finish(): MeshData | null {
    if (!this.indices) return null;
    return {
      position: this.position.slice(0, this.verts * 3),
      uv: this.uv.slice(0, this.verts * 2),
      shade: this.shade.slice(0, this.verts * 3),
      index: this.index.slice(0, this.indices),
    };
  }
}

const solid = new Builder();
const water = new Builder();

export function buildChunk(world: World, cx: number, cz: number): { solid: MeshData | null; water: MeshData | null } {
  const { blocks, sky, blk, top } = world;
  solid.reset();
  water.reset();

  // sampling helpers; outside the world counts as open, sunlit air
  let accSky = 0;
  let accBlk = 0;
  let accN = 0;
  const probe = (x: number, y: number, z: number): number => {
    if (y < 0) return 1;
    if (x < 0 || x >= W || z < 0 || z >= D || y >= H) {
      accSky += 255;
      accN++;
      return 0;
    }
    const i = idx(x, y, z);
    if (OPAQUE[blocks[i]]) return 1;
    accSky += LIGHT[sky[i]];
    accBlk += LIGHT[blk[i]];
    accN++;
    return 0;
  };
  const blockAt = (x: number, y: number, z: number) => (x < 0 || x >= W || z < 0 || z >= D || y >= H ? B.AIR : y < 0 ? B.BEDROCK : blocks[idx(x, y, z)]);

  const x0 = cx * CHUNK;
  const z0 = cz * CHUNK;
  for (let z = z0; z < z0 + CHUNK; z++) {
    for (let x = x0; x < x0 + CHUNK; x++) {
      const columnTop = top[z * W + x];
      for (let y = 0; y <= columnTop; y++) {
        const i = idx(x, y, z);
        const b = blocks[i];
        if (b === B.AIR) continue;
        const info = BLOCKS[b];

        if (CROSS[b]) {
          const [u0, v0, u1, v1] = UV[info.tiles[1]];
          const s = LIGHT[sky[i]];
          const l = LIGHT[blk[i]];
          const diagonals = [[0.15, 0.15, 0.85, 0.85], [0.15, 0.85, 0.85, 0.15]];
          for (const [ax, az, bx, bz] of diagonals) {
            for (let side = 0; side < 2; side++) {
              const [px, pz, qx, qz] = side ? [bx, bz, ax, az] : [ax, az, bx, bz];
              solid.vertex(x + px, y, z + pz, u0, v1, s, l, 235);
              solid.vertex(x + qx, y, z + qz, u1, v1, s, l, 235);
              solid.vertex(x + qx, y + 0.9, z + qz, u1, v0, s, l, 255);
              solid.vertex(x + px, y + 0.9, z + pz, u0, v0, s, l, 255);
              solid.quad(false);
            }
          }
          continue;
        }

        if (b === B.WATER) {
          const above = blockAt(x, y + 1, z);
          const surface = above !== B.WATER;
          const level = surface ? 0.88 : 1;
          for (let f = 0; f < 6; f++) {
            if (f === 3) continue;
            const face = FACES[f];
            const nx = x + face.n[0];
            const nz = z + face.n[2];
            if (nx < 0 || nx >= W || nz < 0 || nz >= D) continue;
            const n = f === 2 ? above : blocks[idx(nx, y, nz)];
            if (n === B.WATER || (f !== 2 && n !== B.AIR && !CROSS[n])) continue;
            if (f === 2 && OPAQUE[n]) continue;
            const li = idx(nx, Math.min(H - 1, y + face.n[1]), nz);
            const [u0, v0, u1, v1] = UV[info.tiles[1]];
            for (let c = 0; c < 4; c++) {
              const corner = face.c[c];
              water.vertex(
                x + corner[0],
                y + corner[1] * level,
                z + corner[2],
                CORNER_UV[c][0] ? u1 : u0,
                CORNER_UV[c][1] ? v0 : v1,
                LIGHT[sky[li]],
                LIGHT[blk[li]],
                Math.round(255 * face.s),
              );
            }
            water.quad(false);
          }
          continue;
        }

        const glow = EMIT[b] > 0;
        for (let f = 0; f < 6; f++) {
          const face = FACES[f];
          const nx = x + face.n[0];
          const ny = y + face.n[1];
          const nz = z + face.n[2];
          const n = blockAt(nx, ny, nz);
          if (OPAQUE[n] || (n === b && !OPAQUE[b])) continue;
          const [u0, v0, u1, v1] = UV[info.tiles[face.tile]];
          // tangent axes: the two axes the normal does not use
          const ua = face.n[0] ? 1 : 0;
          const va = face.n[2] ? 1 : 2;
          const ao = [0, 0, 0, 0];
          for (let c = 0; c < 4; c++) {
            const corner = face.c[c];
            const o1 = [0, 0, 0];
            const o2 = [0, 0, 0];
            o1[ua] = corner[ua] ? 1 : -1;
            o2[va] = corner[va] ? 1 : -1;
            accSky = accBlk = accN = 0;
            probe(nx, ny, nz);
            const s1 = probe(nx + o1[0], ny + o1[1], nz + o1[2]);
            const s2 = probe(nx + o2[0], ny + o2[1], nz + o2[2]);
            const s3 = s1 && s2 ? 1 : probe(nx + o1[0] + o2[0], ny + o1[1] + o2[1], nz + o1[2] + o2[2]);
            const occlusion = s1 && s2 ? 0 : 3 - s1 - s2 - s3;
            ao[c] = occlusion;
            const count = accN || 1;
            solid.vertex(
              x + corner[0],
              y + corner[1],
              z + corner[2],
              CORNER_UV[c][0] ? u1 : u0,
              CORNER_UV[c][1] ? v0 : v1,
              accSky / count,
              glow ? 255 : accBlk / count,
              Math.round(255 * face.s * AO[occlusion]),
            );
          }
          solid.quad(ao[0] + ao[2] < ao[1] + ao[3]);
        }
      }
    }
  }
  return { solid: solid.finish(), water: water.finish() };
}
