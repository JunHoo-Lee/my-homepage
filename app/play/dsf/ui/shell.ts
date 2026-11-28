/*
 * The shell's state machine, outside React.
 *
 * It owns what is true (which ruins are solved, who has been ruled out),
 * what the world has been told to show, which window is open and which
 * sequence of the script is running. React reads one immutable snapshot
 * through useSyncExternalStore; the debug handle (window.__dsf) calls the
 * same methods synchronously, which is why none of this lives in component
 * state.
 *
 * Two lists matter (spec 2.2, rule 5): `solved` is the truth, set when a
 * puzzle reports solved; `shown` is what the world displays, and an id only
 * joins it after the cue that animates it has ended.
 */

import type { Synth } from "../../shared/synth";
import { DOOR_NEEDS, QUESTION, SITES, TITLE, type SiteId } from "../content";
import { END, allPages, checkScript, doorLocked, doorPre, ending, opening, ruinPost, ruinPre, suspectStone, suspectTalk, type Act, type Speaker, type Step } from "../script";
import type { Near, Scene, StatueId, World } from "../world";

export type Screen = "title" | "play" | "ending" | "finale";
export type Open = { kind: "panel"; id: SiteId } | { kind: "book"; note: SiteId | null } | null;

export type Page =
  | { kind: "say"; who: Speaker; text: string; sub?: string; auto?: number }
  | { kind: "rows"; who: Speaker; text: string; plate?: "question"; rows: string[]; typed: boolean };

/** What the message window shows. `page` is null while a cue or a pause runs. */
export type Talk = { serial: number; page: Page | null; instant: boolean };

export type Snap = {
  screen: Screen;
  open: Open;
  talk: Talk | null;
  /** A panel that was just closed and is still fading out. */
  closing: SiteId | null;
  near: Near;
  solved: SiteId[];
  shown: SiteId[];
  /** Suspects that have been ruled out, and the ones the world already shows as stone. */
  questioned: string[];
  stone: string[];
  compass: boolean;
  question: string;
  /** Bumps when the question changes, so the HUD can flash. */
  questionFlash: number;
  notice: { id: number; text: string } | null;
  muted: boolean;
  /** How the player last gave input: decides which hints are shown. */
  input: "touch" | "keys";
  /** The "Space" hint on the action chip, shown until the first use. */
  keyHint: boolean;
  endPhase: number;
  /** The closing cards have been on for 3 s: offer "Skip". */
  endSkip: boolean;
  /** The door is open and the ending has been seen. */
  finished: boolean;
};

const RUIN_IDS = SITES.filter((site) => site.id !== "door").map((site) => site.id);
const isStatue = (id: string): id is StatueId => id === "prompter" || id === "bookkeeper" || id === "copyist" || id === "artist";

const INITIAL: Snap = {
  screen: "title",
  open: null,
  talk: null,
  closing: null,
  near: null,
  solved: [],
  shown: [],
  questioned: [],
  stone: [],
  compass: false,
  question: QUESTION.short,
  questionFlash: 0,
  notice: null,
  muted: false,
  input: "keys",
  keyHint: true,
  endPhase: END.none,
  endSkip: false,
  finished: false,
};

export type Shell = ReturnType<typeof createShell>;

export function createShell(synth: Synth) {
  let snap: Snap = INITIAL;
  let world: World | null = null;
  const listeners = new Set<() => void>();

  // what the world was last told, so it is only told about changes
  let toldPaused: boolean | null = null;
  let toldProgress = "";
  let toldScene = "";
  // the Finale can be read from the Notebook without the world leaving the scene it is in
  let scene: Scene = "title";

  let run: { steps: Step[]; i: number; interject: boolean } | null = null;
  let serial = 0;
  let gen = 0; // bumps whenever the running sequence moves; stale continuations compare against it
  let cueGen = -1; // the value of gen while a cue of the running sequence is in flight
  let timer: number | undefined;
  let hideTimer: number | undefined;
  let noticeTimer: number | undefined;
  let endTimer: number | undefined;
  let closeTimer: number | undefined;
  let noticeId = 0;
  let visited: SiteId[] = [];
  let fiveDone = false;
  let resumeAfterBook = false;
  let hinted = false;

  function syncWorld() {
    if (!world) return;
    if (scene !== toldScene) {
      toldScene = scene;
      world.setScene(scene);
    }
    const progress = `${snap.shown.join(",")}|${snap.stone.join(",")}|${snap.compass ? 1 : 0}`;
    if (progress !== toldProgress) {
      toldProgress = progress;
      world.setProgress(snap.shown, snap.stone, snap.compass);
    }
    const paused = snap.screen !== "play" || snap.open !== null || snap.talk !== null;
    if (paused !== toldPaused) {
      toldPaused = paused;
      world.setPaused(paused);
    }
  }

  function set(patch: Partial<Snap>) {
    snap = { ...snap, ...patch };
    syncWorld();
    for (const listener of listeners) listener();
  }

  const ruinsSolved = () => RUIN_IDS.filter((id) => snap.solved.includes(id)).length;

  /* ---------------------------------------------------------------- sounds */

  const sound = {
    advance: () => synth.tone({ freq: 700, to: 900, dur: 0.03, gain: 0.06, type: "triangle" }),
    confirm: () => synth.arp([660, 990], 0.06, { dur: 0.09, gain: 0.07, type: "triangle" }),
    cancel: () => synth.arp([520, 390], 0.06, { dur: 0.09, gain: 0.07, type: "triangle" }),
    chime: () => synth.arp([196, 147], 0.16, { dur: 0.7, gain: 0.1, type: "sine" }),
    stamp: () => {
      synth.noise({ dur: 0.06, gain: 0.12, freq: 200 });
      synth.tone({ freq: 120, to: 80, dur: 0.16, gain: 0.14, type: "sine" });
    },
  };

  /* ---------------------------------------------------------------- notices */

  function notice(text: string) {
    noticeId += 1;
    window.clearTimeout(noticeTimer);
    const id = noticeId;
    set({ notice: { id, text } });
    noticeTimer = window.setTimeout(() => {
      if (snap.notice?.id === id) set({ notice: null });
    }, 3500);
  }

  /** Closes the puzzle panel; it stays for 250 ms while it fades. */
  function closePanel(patch: Partial<Snap> = {}) {
    const open = snap.open;
    window.clearTimeout(closeTimer);
    if (open?.kind !== "panel") {
      set({ open: null, ...patch });
      return;
    }
    const id = open.id;
    set({ open: null, closing: id, ...patch });
    closeTimer = window.setTimeout(() => {
      if (snap.closing === id) set({ closing: null });
    }, 250);
  }

  /* ---------------------------------------------------------------- sequences */

  function perform(act: Act) {
    if (act.kind === "panel") set({ open: { kind: "panel", id: act.id }, closing: null, notice: null });
    else if (act.kind === "shown") {
      if (!snap.shown.includes(act.id)) set({ shown: [...snap.shown, act.id], finished: snap.finished || act.id === "door" });
    } else if (act.kind === "questioned") {
      if (!snap.stone.includes(act.id)) set({ stone: [...snap.stone, act.id], questioned: snap.questioned.includes(act.id) ? snap.questioned : [...snap.questioned, act.id] });
    } else if (act.kind === "question") set({ question: act.text, questionFlash: snap.questionFlash + 1 });
    else if (act.kind === "compass") set({ compass: true });
    else if (act.kind === "notice") notice(act.text);
    else if (act.kind === "hint") {
      if (!hinted) {
        hinted = true;
        notice(snap.input === "touch" ? TITLE.hintTouch : TITLE.hintKeys);
      }
    } else if (act.kind === "ending") {
      set({ endPhase: act.phase });
    } else if (act.kind === "sound") sound[act.name]();
  }

  function clearTimers() {
    window.clearTimeout(timer);
    window.clearTimeout(hideTimer);
    timer = undefined;
    hideTimer = undefined;
  }

  function showPage(page: Page, instant: boolean) {
    serial += 1;
    set({ talk: { serial, page, instant } });
  }

  /** The window goes away while the world animates, but not for a cue that ends within a few frames. */
  function hideWindowSoon() {
    if (snap.talk?.page === null) return;
    const mine = gen;
    hideTimer = window.setTimeout(() => {
      if (gen === mine && run) set({ talk: { serial, page: null, instant: false } });
    }, 90);
    if (!snap.talk) set({ talk: { serial, page: null, instant: false } });
  }

  function finish() {
    run = null;
    clearTimers();
    gen += 1;
    set({ talk: null });
  }

  /** Runs steps from the current one until something has to wait for the player, the world or the clock. */
  function step() {
    clearTimers();
    for (;;) {
      if (!run) return;
      const current = run.steps[run.i];
      if (!current) {
        finish();
        return;
      }
      gen += 1;
      const mine = gen;
      const moveOn = () => {
        if (gen !== mine || !run) return;
        run.i += 1;
        step();
      };
      if (current.t === "act") {
        run.i += 1;
        perform(current.act);
        continue;
      }
      if (current.t === "cue") {
        hideWindowSoon();
        cueGen = mine;
        const done = world ? world.cue(current.cue) : Promise.resolve();
        void done.then(moveOn, moveOn);
        // a cue that never reports back must not strand the player
        timer = window.setTimeout(() => {
          if (gen !== mine) return;
          world?.finishCues();
          moveOn();
        }, 8000);
        return;
      }
      if (current.t === "wait") {
        hideWindowSoon();
        timer = window.setTimeout(moveOn, current.ms);
        return;
      }
      if (current.t === "say") showPage({ kind: "say", who: current.who, text: current.text, sub: current.sub, auto: current.auto }, false);
      else if (current.t === "choice") showPage({ kind: "rows", who: current.who, text: current.text, rows: current.rows, typed: true }, false);
      else showPage({ kind: "rows", who: current.who, text: current.text, plate: current.plate, rows: current.buttons.map((button) => button.label), typed: true }, false);
      return;
    }
  }

  function start(steps: Step[]) {
    run = { steps, i: 0, interject: false };
    step();
  }

  /**
   * Jumps over what is left of the talk: pages are dropped and cues end at once with their state applied.
   * The player's Skip stops at the next choice or hold. The debug skip also answers choices correctly and
   * shows the hold page fully typed.
   */
  function fastForward(debug: boolean) {
    if (!run) return;
    clearTimers();
    const cueInFlight = cueGen === gen;
    gen += 1;
    let first = true;
    for (;;) {
      const current: Step | undefined = run.steps[run.i];
      if (!current) {
        finish();
        return;
      }
      if (current.t === "say" || current.t === "wait") run.i += 1;
      else if (current.t === "cue") {
        // a cue that is already running is ended; one that has not started is queued and ended
        if (!(first && cueInFlight)) void world?.cue(current.cue).catch(() => undefined);
        world?.finishCues();
        run.i += 1;
      } else if (current.t === "act") {
        run.i += 1;
        perform(current.act);
      } else if (current.t === "choice") {
        if (run.interject) run.interject = false;
        if (debug) run.i += 1;
        else {
          gen += 1;
          showPage({ kind: "rows", who: current.who, text: current.text, rows: current.rows, typed: true }, false);
          return;
        }
      } else {
        gen += 1;
        showPage({ kind: "rows", who: current.who, text: current.text, plate: current.plate, rows: current.buttons.map((button) => button.label), typed: true }, debug);
        return;
      }
      first = false;
      if (!run) return;
    }
  }

  /* ---------------------------------------------------------------- what the player does */

  const api = {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    get: () => snap,
    initial: () => INITIAL,

    attach(next: World) {
      world = next;
      toldPaused = null;
      toldProgress = "";
      toldScene = "";
      syncWorld();
    },
    detach(old: World) {
      if (world === old) world = null;
    },
    /** The saved mute setting is only known in the browser. */
    syncMuted() {
      if (snap.muted !== synth.muted) set({ muted: synth.muted });
    },
    dispose() {
      clearTimers();
      window.clearTimeout(noticeTimer);
      window.clearTimeout(endTimer);
      window.clearTimeout(closeTimer);
    },

    setInput(input: "touch" | "keys") {
      if (snap.input !== input) set({ input });
    },
    near(near: Near) {
      set({ near });
    },
    notice,
    toggleMute() {
      synth.unlock();
      synth.setMuted(!synth.muted);
      set({ muted: synth.muted });
    },

    wake() {
      if (snap.screen !== "title") return;
      synth.unlock();
      sound.confirm();
      scene = "play";
      set({ screen: "play" });
      start(opening());
    },

    /** Examine or Talk. `near` comes from the chip, a key or a tap that walked up to something. */
    interact(target?: NonNullable<Near>) {
      const near = target ?? snap.near;
      if (snap.screen !== "play" || snap.open || snap.talk || !near) return;
      synth.unlock();
      sound.confirm();
      if (snap.keyHint) set({ keyHint: false });
      if (near.kind === "statue") {
        if (!isStatue(near.id)) return;
        start(snap.questioned.includes(near.id) ? suspectStone(near.id) : suspectTalk(near.id));
        return;
      }
      const id = near.id;
      const solved = snap.solved.includes(id);
      const shown = snap.shown.includes(id);
      if (id === "door") {
        if (solved && shown) set({ open: { kind: "book", note: "door" } });
        else if (solved) set({ open: { kind: "panel", id }, closing: null });
        else if (ruinsSolved() < DOOR_NEEDS) start(doorLocked(ruinsSolved()));
        else if (!visited.includes(id)) {
          visited = [...visited, id];
          start(doorPre());
        } else set({ open: { kind: "panel", id }, closing: null });
        return;
      }
      if (solved && shown) set({ open: { kind: "book", note: id } });
      else if (solved) api.continuePanel(id);
      else if (!visited.includes(id)) {
        visited = [...visited, id];
        start(ruinPre(id));
      } else set({ open: { kind: "panel", id }, closing: null });
    },

    /** The page is fully typed and the player asked for the next one. */
    next() {
      if (!run || snap.talk?.page?.kind !== "say") return;
      sound.advance();
      if (run.interject) {
        run.interject = false;
        step();
        return;
      }
      run.i += 1;
      step();
    },

    /** A row of a choice or of a hold page. */
    pick(row: number) {
      if (!run || snap.talk?.page?.kind !== "rows") return;
      const current = run.steps[run.i];
      if (!current) return;
      if (current.t === "choice") {
        if (row === current.right) {
          sound.confirm();
          run.i += 1;
          step();
        } else {
          sound.cancel();
          run.interject = true;
          gen += 1;
          showPage({ kind: "say", who: current.wrong.who, text: current.wrong.text }, false);
        }
        return;
      }
      if (current.t !== "hold") return;
      const button = current.buttons[row];
      if (!button) return;
      sound.confirm();
      if (button.act === "note" && current.note) {
        resumeAfterBook = true;
        set({ open: { kind: "book", note: current.note } });
        return;
      }
      run.i += 1;
      step();
    },

    /** The player's Skip. */
    skipTalk() {
      if (!run) return;
      sound.cancel();
      fastForward(false);
    },

    /* ------------------------------------------------------------ panel and notebook */

    solve(id: SiteId) {
      if (snap.solved.includes(id)) return;
      set({ solved: [...snap.solved, id] });
    },

    /** "Continue" in a solved panel: close it and tell the story of what was found. */
    continuePanel(id: SiteId) {
      if (id === "door" || !snap.solved.includes(id)) return;
      const fifth = !fiveDone && ruinsSolved() >= DOOR_NEEDS;
      if (fifth) fiveDone = true;
      closePanel();
      start(ruinPost(id, fifth));
    },

    goThrough() {
      if (!snap.solved.includes("door") || snap.screen !== "play") return;
      sound.confirm();
      window.clearTimeout(endTimer);
      scene = "ending";
      closePanel({ screen: "ending", endPhase: END.none, endSkip: false, notice: null });
      endTimer = window.setTimeout(() => {
        if (snap.screen === "ending") set({ endSkip: true });
      }, 3000);
      start(ending());
    },

    /** Escape, or "Leave it for now". A solved panel goes on to its story instead. */
    closeOpen() {
      const open = snap.open;
      if (!open) return;
      if (open.kind === "panel") {
        if (open.id !== "door" && snap.solved.includes(open.id) && !snap.shown.includes(open.id)) {
          api.continuePanel(open.id);
          return;
        }
        sound.cancel();
        closePanel();
        return;
      }
      sound.cancel();
      set({ open: null });
      if (resumeAfterBook) {
        resumeAfterBook = false;
        if (run) {
          run.i += 1;
          step();
        }
      }
    },

    openBook(note: SiteId | null = null) {
      if (snap.screen !== "play") return;
      if (snap.open ? snap.open.kind !== "book" : snap.talk !== null) return;
      synth.unlock();
      if (!snap.open) sound.confirm();
      set({ open: { kind: "book", note } });
    },

    openFinale() {
      if (!snap.solved.includes("door")) return;
      sound.confirm();
      run = null;
      clearTimers();
      gen += 1;
      resumeAfterBook = false;
      set({ screen: "finale", open: null, talk: null });
    },

    backFromFinale() {
      if (snap.screen !== "finale") return;
      sound.cancel();
      scene = "play";
      set({ screen: "play", endPhase: END.none, endSkip: false });
    },

    /* ------------------------------------------------------------ debug (window.__dsf) */

    debugSkip() {
      fastForward(true);
    },

    debugGoto(id: string) {
      if (snap.screen === "title") {
        synth.unlock();
        scene = "play";
        set({ screen: "play" });
        start(opening());
      }
      for (let guard = 0; guard < 12; guard += 1) {
        fastForward(true);
        const open = snap.open;
        if (run && snap.talk?.page?.kind === "rows" && !open) {
          // a pending hold: take its first row (Walk on, Rule it out)
          run.i += 1;
          step();
        } else if (run && open?.kind === "book") {
          resumeAfterBook = false;
          set({ open: null });
          run.i += 1;
          step();
        } else if (!run && open?.kind === "panel" && open.id !== "door" && snap.solved.includes(open.id) && !snap.shown.includes(open.id)) {
          api.continuePanel(open.id);
        } else break;
      }
      if (snap.screen !== "play") {
        scene = "play";
        set({ screen: "play", endPhase: END.none, endSkip: false });
      }
      resumeAfterBook = false;
      if (snap.open || snap.closing) set({ open: null, closing: null });
      world?.debug.goto(id);
    },

    /** Layout test: any page of the script in the real message window, fully typed. */
    debugShow(index: number) {
      const page = allPages()[index];
      if (!page || snap.screen !== "play") return;
      clearTimers();
      gen += 1;
      run = { steps: [{ t: "say", who: page.who, text: page.text, sub: page.sub }], i: 0, interject: false };
      serial += 1;
      set({ open: null, closing: null, talk: { serial, page: { kind: "say", who: page.who, text: page.text, sub: page.sub }, instant: true } });
    },

    /** Marks a ruin as solved and shown without playing it, for tests of what comes after. */
    debugSolve(id: string) {
      const site = SITES.find((item) => item.id === id);
      if (!site || snap.solved.includes(site.id)) return;
      set({
        solved: [...snap.solved, site.id],
        shown: [...snap.shown, site.id],
        question: site.verdict,
        compass: snap.compass || site.id === "footprints",
        finished: snap.finished || site.id === "door",
      });
      if (!fiveDone && ruinsSolved() >= DOOR_NEEDS) fiveDone = true;
    },

    debugState(): Record<string, number | string> {
      return { ...(world?.debug.state() ?? {}), solved: snap.solved.join(",") };
    },
  };

  if (process.env.NODE_ENV !== "production") {
    const problems = checkScript();
    if (problems.length > 0) console.error(`dsf script: ${problems.length} page(s) do not fit the message window\n${problems.join("\n")}`);
  }

  return api;
}
