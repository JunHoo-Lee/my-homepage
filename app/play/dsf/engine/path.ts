/*
 * Walking on the grid: breadth-first search over the 42 x 50 tiles.
 */

import { MAP_H, MAP_W, type Tile } from "../map";

export type Reach = { dist: Int16Array; prev: Int16Array };

const STEPS: Tile[] = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];

/** Distances from a tile to every tile that can be walked to. -1 means out of reach. */
export function flood(from: Tile, walkable: (x: number, y: number) => boolean): Reach {
  const dist = new Int16Array(MAP_W * MAP_H).fill(-1);
  const prev = new Int16Array(MAP_W * MAP_H).fill(-1);
  const queue = new Int16Array(MAP_W * MAP_H);
  let head = 0;
  let tail = 0;
  const start = from[1] * MAP_W + from[0];
  dist[start] = 0;
  queue[tail++] = start;
  while (head < tail) {
    const at = queue[head++];
    const x = at % MAP_W;
    const y = (at - x) / MAP_W;
    for (const [dx, dy] of STEPS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
      const next = ny * MAP_W + nx;
      if (dist[next] >= 0 || !walkable(nx, ny)) continue;
      dist[next] = dist[at] + 1;
      prev[next] = at;
      queue[tail++] = next;
    }
  }
  return { dist, prev };
}

/** The tiles to step on, in order, not counting the start. Empty when out of reach. */
export function route(reach: Reach, to: Tile): Tile[] {
  let at = to[1] * MAP_W + to[0];
  if (to[0] < 0 || to[1] < 0 || to[0] >= MAP_W || to[1] >= MAP_H || reach.dist[at] < 0) return [];
  const tiles: Tile[] = [];
  while (reach.dist[at] > 0) {
    tiles.push([at % MAP_W, Math.floor(at / MAP_W)]);
    at = reach.prev[at];
  }
  return tiles.reverse();
}

/** The reachable tile closest to a point, for taps on the sea or on a prop. */
export function nearest(reach: Reach, to: Tile): Tile | null {
  let best: Tile | null = null;
  let bestScore = Infinity;
  for (let y = 0; y < MAP_H; y += 1) {
    for (let x = 0; x < MAP_W; x += 1) {
      const d = reach.dist[y * MAP_W + x];
      if (d < 0) continue;
      const score = (x - to[0]) ** 2 + (y - to[1]) ** 2 + d * 0.001;
      if (score < bestScore) {
        bestScore = score;
        best = [x, y];
      }
    }
  }
  return best;
}
