/*
 * Cutscene cues run one at a time, in call order.
 *
 * A job animates a change and its `end` leaves the finished state behind.
 * `end` must be complete on its own: finishing a cue that never began calls
 * only `end`.
 */

export type Job = {
  /** Milliseconds. */
  dur: number;
  begin?(): void;
  /** Called every frame while running, with the time since `begin`. */
  step?(ms: number): void;
  end(): void;
};

type Entry = { job: Job; resolve(): void; ms: number; begun: boolean };

export type CueQueue = {
  push(job: Job): Promise<void>;
  update(dtMs: number): void;
  /** End everything now, in order, with each end state applied. */
  finish(): void;
  /** Forget everything and let the callers go. Nothing is applied. */
  drop(): void;
  busy(): boolean;
};

export function createCueQueue(): CueQueue {
  let queue: Entry[] = [];

  return {
    push(job) {
      return new Promise<void>((resolve) => {
        queue.push({ job, resolve, ms: 0, begun: false });
      });
    },
    update(dtMs) {
      let budget = dtMs;
      while (queue.length) {
        const entry = queue[0];
        if (!entry.begun) {
          entry.begun = true;
          entry.job.begin?.();
        }
        const left = entry.job.dur - entry.ms;
        if (budget < left) {
          entry.ms += budget;
          entry.job.step?.(entry.ms);
          return;
        }
        budget -= Math.max(0, left);
        queue.shift();
        entry.job.end();
        entry.resolve();
      }
    },
    finish() {
      const all = queue;
      queue = [];
      for (const entry of all) {
        entry.job.end();
        entry.resolve();
      }
    },
    drop() {
      const all = queue;
      queue = [];
      for (const entry of all) entry.resolve();
    },
    busy: () => queue.length > 0,
  };
}
