/*
 * Raw input: which way the keys point, and one tracked pointer on the canvas.
 * What a tap or a hold means is decided by the world.
 */

/** Column order of the character sheets: down, up, left, right. */
export type Dir = 0 | 1 | 2 | 3;
export const DIR_DX = [0, 0, -1, 1] as const;
export const DIR_DY = [1, -1, 0, 0] as const;
export const DIR_NAME = ["down", "up", "left", "right"] as const;

const KEY_DIR: Record<string, Dir> = {
  ArrowDown: 0,
  KeyS: 0,
  ArrowUp: 1,
  KeyW: 1,
  ArrowLeft: 2,
  KeyA: 2,
  ArrowRight: 3,
  KeyD: 3,
};

const HOLD_MS = 180;

export type Pointer = {
  id: number;
  /** CSS pixels from the canvas's top left. */
  x: number;
  y: number;
  startX: number;
  startY: number;
  downAt: number;
  /** True once the finger has been down long enough to steer. */
  steering: boolean;
};

export type Input = {
  /** The direction of the key pressed last that is still held. */
  keyDir(): Dir | null;
  /** The pointer that is down, once it counts as a hold. */
  held(now: number): Pointer | null;
  drop(): void;
  dispose(): void;
};

export function createInput(
  canvas: HTMLCanvasElement,
  hooks: { paused(): boolean; onTap(x: number, y: number): void; onGesture(): void },
): Input {
  const keys: string[] = [];
  let pointer: Pointer | null = null;

  const place = (event: PointerEvent, target: { x: number; y: number }) => {
    const rect = canvas.getBoundingClientRect();
    target.x = event.clientX - rect.left;
    target.y = event.clientY - rect.top;
  };

  function onKeyDown(event: KeyboardEvent) {
    if (!(event.code in KEY_DIR) || hooks.paused()) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    event.preventDefault();
    hooks.onGesture();
    const at = keys.indexOf(event.code);
    if (at >= 0) {
      if (event.repeat) return;
      keys.splice(at, 1);
    }
    keys.push(event.code);
  }
  function onKeyUp(event: KeyboardEvent) {
    const at = keys.indexOf(event.code);
    if (at >= 0) keys.splice(at, 1);
  }
  function onPointerDown(event: PointerEvent) {
    if (hooks.paused() || pointer || (event.pointerType === "mouse" && event.button !== 0)) return;
    hooks.onGesture();
    const spot = { x: 0, y: 0 };
    place(event, spot);
    pointer = { id: event.pointerId, x: spot.x, y: spot.y, startX: spot.x, startY: spot.y, downAt: performance.now(), steering: false };
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      /* not every pointer can be captured */
    }
  }
  function onPointerMove(event: PointerEvent) {
    if (pointer && event.pointerId === pointer.id) place(event, pointer);
  }
  function onPointerUp(event: PointerEvent) {
    if (!pointer || event.pointerId !== pointer.id) return;
    const done = pointer;
    pointer = null;
    place(event, done);
    if (hooks.paused()) return;
    const moved = Math.hypot(done.x - done.startX, done.y - done.startY);
    const age = performance.now() - done.downAt;
    // a short press is a tap, and so is a slow press that never moved or steered far
    if (!done.steering || (age < 350 && moved < 12)) hooks.onTap(done.x, done.y);
  }
  function onPointerCancel(event: PointerEvent) {
    if (pointer && event.pointerId === pointer.id) pointer = null;
  }
  function onBlur() {
    keys.length = 0;
    pointer = null;
  }
  const onContextMenu = (event: Event) => event.preventDefault();

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerCancel);
  canvas.addEventListener("contextmenu", onContextMenu);

  return {
    keyDir() {
      return keys.length ? KEY_DIR[keys[keys.length - 1]] : null;
    },
    held(now) {
      if (!pointer) return null;
      if (!pointer.steering && now - pointer.downAt > HOLD_MS) pointer.steering = true;
      return pointer.steering ? pointer : null;
    },
    drop() {
      keys.length = 0;
      pointer = null;
    },
    dispose() {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerCancel);
      canvas.removeEventListener("contextmenu", onContextMenu);
    },
  };
}
