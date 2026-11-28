"use client";

/*
 * "What I Cannot Create": the shell around the island.
 *
 * The world (world.ts) is a canvas that fills the screen and only knows
 * about walking, light and what is nearby. Everything with words in it is
 * DOM laid over the canvas: the message window, the HUD, the puzzle panel,
 * the Notebook, the title and the ending. Which of those is showing is
 * decided by one state machine outside React (ui/shell.ts).
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { sharedSynth } from "../shared/synth";
import { SITES } from "./content";
import { END, allPages } from "./script";
import Dialogue from "./ui/Dialogue";
import { EndCards, Finale } from "./ui/Ending";
import { ActionChip, Hud, Notice } from "./ui/Hud";
import kit from "./ui/kit.module.css";
import Notebook from "./ui/Notebook";
import Panel from "./ui/Panel";
import { createShell } from "./ui/shell";
import Title from "./ui/Title";
import { createWorld } from "./world";

const RUINS = SITES.filter((site) => site.id !== "door");

type DebugHandle = {
  goto(id: string): void;
  state(): Record<string, number | string>;
  skip(): void;
  /** Extras for the layout tests: every page of the script, a way to show one, and a way to mark a ruin solved. */
  pages: typeof allPages;
  show(index: number): void;
  solve(id: string): void;
};

export default function DsfClient() {
  const synth = sharedSynth();
  const [shell] = useState(() => createShell(synth));
  const snap = useSyncExternalStore(shell.subscribe, shell.get, shell.initial);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // the island lives as long as the page
  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;
    const world = createWorld(canvas, synth, {
      onNear: (near) => shell.near(near),
      onToast: (text) => shell.notice(text),
      onInteract: (near) => shell.interact(near),
      // one art pixel has one size everywhere: the interface borrows the world's
      onScale: (value) => {
        if (Number.isFinite(value) && value > 0) root.style.setProperty("--px", `${value}px`);
      },
    });
    shell.attach(world);
    // the saved mute setting is only known in the browser, after hydration
    const sync = window.setTimeout(() => shell.syncMuted(), 0);
    const holder = window as unknown as { __dsf?: DebugHandle };
    if (new URLSearchParams(window.location.search).has("debug")) {
      holder.__dsf = {
        goto: (id) => shell.debugGoto(id),
        state: () => shell.debugState(),
        skip: () => shell.debugSkip(),
        pages: allPages,
        show: (index) => shell.debugShow(index),
        solve: (id) => shell.debugSolve(id),
      };
    }
    return () => {
      window.clearTimeout(sync);
      delete holder.__dsf;
      shell.detach(world);
      world.dispose();
    };
  }, [shell, synth]);

  useEffect(() => () => shell.dispose(), [shell]);

  // keys the shell owns, by physical key so they also work with an IME active
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      shell.setInput("keys");
      const now = shell.get();
      const target = event.target instanceof HTMLElement ? event.target : null;
      const onControl = target !== null && ["BUTTON", "A", "INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      const act = event.code === "Space" || event.code === "Enter" || event.code === "KeyE" || event.code === "KeyZ";
      // Space and Enter on a focused control belong to that control
      const native = onControl && (event.code === "Space" || event.code === "Enter");
      if (event.code === "KeyM" && !event.repeat) shell.toggleMute();
      else if (event.code === "Escape" || event.code === "KeyX") {
        if (now.screen === "finale") shell.backFromFinale();
        else if (now.open) shell.closeOpen();
      } else if (event.repeat || now.talk) return;
      else if (now.screen === "title") {
        if (event.code === "Enter" && !native) {
          event.preventDefault();
          shell.wake();
        }
      } else if (now.screen === "play" && !now.open) {
        if (act && !native) {
          event.preventDefault();
          shell.interact();
        } else if (event.code === "KeyL") shell.openBook();
      } else if (now.screen === "play" && now.open?.kind === "book" && event.code === "KeyL") shell.closeOpen();
    }
    function onPointer(event: PointerEvent) {
      shell.setInput(event.pointerType === "touch" || event.pointerType === "pen" ? "touch" : "keys");
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer, true);
    };
  }, [shell]);

  const { screen, open, talk, near } = snap;
  const insights = RUINS.filter((site) => snap.solved.includes(site.id)).length;
  const panelId = open?.kind === "panel" ? open.id : snap.closing;
  const panelSite = panelId ? SITES.find((site) => site.id === panelId) : undefined;
  const modal = open !== null || screen === "finale";
  const free = screen === "play" && !open && !talk;
  const talking = talk?.page && !open && screen !== "finale" ? talk : null;

  return (
    <div ref={rootRef} className={kit.root}>
      <div className={kit.stage} inert={modal}>
        <canvas ref={canvasRef} className={kit.world} role="img" aria-label="An island at night in a sea of static. Walk it to find the ruins." />
      </div>

      {screen === "play" ? <Hud question={snap.question} flash={snap.questionFlash} insights={insights} muted={snap.muted} inert={modal} onBook={() => shell.openBook()} onMute={() => shell.toggleMute()} /> : null}

      {screen === "title" ? <Title muted={snap.muted} onStart={() => shell.wake()} onMute={() => shell.toggleMute()} /> : null}

      {screen === "ending" ? <EndCards phase={snap.endPhase} onFinale={() => shell.openFinale()} /> : null}
      {screen === "ending" && snap.endSkip && snap.endPhase < END.button ? (
        <button type="button" className={`${kit.hudWin} ${kit.endSkip}`} onClick={() => shell.skipTalk()}>
          Skip
        </button>
      ) : null}

      <div className={kit.dock}>
        {snap.notice && !talking && !modal && screen === "play" ? <Notice key={snap.notice.id} text={snap.notice.text} /> : null}
        {free && near ? <ActionChip near={near} keyHint={snap.keyHint && snap.input === "keys"} onAct={() => shell.interact()} /> : null}
        {talking ? <Dialogue talk={talking} synth={synth} onNext={shell.next} onPick={shell.pick} onSkip={shell.skipTalk} canSkip={screen === "play"} /> : null}
      </div>

      {panelSite ? (
        <Panel
          key={panelSite.id}
          site={panelSite}
          solved={snap.solved.includes(panelSite.id)}
          leaving={open?.kind !== "panel"}
          synth={synth}
          onSolved={() => shell.solve(panelSite.id)}
          onContinue={() => (panelSite.id === "door" ? shell.goThrough() : shell.continuePanel(panelSite.id))}
          onLeave={() => shell.closeOpen()}
        />
      ) : null}

      {open?.kind === "book" ? (
        <Notebook
          note={open.note}
          solved={snap.solved}
          questioned={snap.questioned}
          muted={snap.muted}
          finished={snap.finished}
          onNote={(id) => shell.openBook(id)}
          onClose={() => shell.closeOpen()}
          onMute={() => shell.toggleMute()}
          onFinale={() => shell.openFinale()}
        />
      ) : null}

      {screen === "finale" ? <Finale onBack={() => shell.backFromFinale()} /> : null}
    </div>
  );
}
