"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

import type { PlayContent } from "../types";
import type { ExploreHandle } from "./engine";
import type { Landmark } from "./terrain";
import styles from "./explore.module.css";

const PLACE_NAMES: Record<string, { name: string; hint: string }> = {
  about: { name: "Base Camp", hint: "About me" },
  links: { name: "Link Gate", hint: "CV, Scholar, GitHub" },
  news: { name: "Notice Board", hint: "News" },
  posts: { name: "Lighthouse", hint: "Posts" },
  education: { name: "Academy", hint: "Education" },
  awards: { name: "Summit", hint: "Awards" },
};

const isExternal = (href: string) => /^https?:\/\//.test(href) || href.endsWith(".pdf");

type Toast = { id: number; text: string };

export default function ExploreClient({ content }: { content: PlayContent }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const compassRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<ExploreHandle | null>(null);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [progress, setProgress] = useState(0);
  const [intro, setIntro] = useState(true);
  const [panel, setPanel] = useState<string | null>(null);
  const [near, setNear] = useState<string | null>(null);
  const [discovered, setDiscovered] = useState<string[]>([]);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [inventory, setInventory] = useState<{ counts: number[]; selected: number }>({ counts: [], selected: 0 });
  const [crystals, setCrystals] = useState({ found: 0, total: 0 });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mapOpen, setMapOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [touch, setTouch] = useState(false);
  const [locked, setLocked] = useState(false);
  const [underwater, setUnderwater] = useState(false);
  const [engine, setEngine] = useState<ExploreHandle | null>(null);

  const labels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [id, place] of Object.entries(PLACE_NAMES)) map[id] = place.name;
    content.publications.forEach((publication, index) => {
      map[`pub:${index}`] = publication.label;
    });
    return map;
  }, [content]);

  const toast = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list.slice(-2), { id, text }]);
    window.setTimeout(() => setToasts((list) => list.filter((item) => item.id !== id)), 3400);
  }, []);

  // ------------------------------------------------------------ engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let handle: ExploreHandle | null = null;
    let cancelled = false;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    setTouch(isTouch);

    import("./engine")
      .then(({ createExplore }) => {
        if (cancelled) return;
        handle = createExplore(
          canvas,
          compassRef.current,
          content.publications.length,
          labels,
          {
            onProgress: setProgress,
            onReady: () => {
              setLandmarks(handle?.landmarks ?? []);
              setEngine(handle);
              setStatus("ready");
            },
            onNear: setNear,
            onDiscover: (id, list, fresh) => {
              setDiscovered(list);
              if (fresh) toast(`Discovered: ${labels[id] ?? id}`);
            },
            onInventory: (counts, selected) => setInventory({ counts, selected }),
            onCrystals: (found, total) => setCrystals({ found, total }),
            onToast: toast,
            onUnderwater: setUnderwater,
            onLock: setLocked,
          },
          { touch: isTouch, debug: new URLSearchParams(window.location.search).has("debug") },
        );
        handleRef.current = handle;
      })
      .catch((error: unknown) => {
        console.error(error);
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
      handle?.dispose();
      handleRef.current = null;
    };
  }, [content, labels, toast]);

  const overlay = intro || panel !== null || mapOpen || menuOpen;
  useEffect(() => {
    handleRef.current?.setPaused(overlay || status !== "ready");
    if (overlay && document.pointerLockElement) document.exitPointerLock();
  }, [overlay, status]);

  useEffect(() => {
    handleRef.current?.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    if (mapOpen && mapRef.current) handleRef.current?.drawMap(mapRef.current);
  }, [mapOpen]);

  const resume = useCallback(() => {
    setIntro(false);
    setPanel(null);
    setMapOpen(false);
    setMenuOpen(false);
    handleRef.current?.lock();
  }, []);

  // ------------------------------------------------------------ keyboard
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (status !== "ready") return;
      if (event.code === "Escape") {
        if (overlay && !intro) {
          setPanel(null);
          setMapOpen(false);
          setMenuOpen(false);
        }
        return;
      }
      if (event.code === "Enter" && intro) {
        resume();
        return;
      }
      if (intro || menuOpen) return;
      if (event.code === "KeyM") {
        setPanel(null);
        setMapOpen((open) => !open);
      } else if ((event.code === "KeyE" || event.code === "Enter") && !mapOpen) {
        if (panel) resume();
        else if (near) setPanel(near);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [intro, mapOpen, menuOpen, near, overlay, panel, resume, status]);

  const total = landmarks.length;
  const nearName = near ? (labels[near] ?? near) : null;
  const handle = engine;

  return (
    <div className={`${styles.root} ${underwater ? styles.underwater : ""}`}>
      <canvas ref={canvasRef} className={styles.canvas} tabIndex={0} aria-label="Voxel world: explore the island to find every section of the homepage" />
      <div className={styles.tint} aria-hidden="true" />

      {touch && status === "ready" && !overlay ? <TouchLayer handle={handleRef} /> : null}

      {status === "ready" && !overlay ? <div className={styles.crosshair} aria-hidden="true" /> : null}

      <header className={styles.top} data-hidden={status !== "ready" || intro}>
        <div className={styles.stats}>
          <span className={styles.chip} title="Landmarks discovered">
            <i className={styles.gem} data-kind="mark" />
            {discovered.length}/{total || "–"}
          </span>
          <span className={styles.chip} title="Crystals found">
            <i className={styles.gem} data-kind="crystal" />
            {crystals.found}/{crystals.total || "–"}
          </span>
        </div>
        <canvas ref={compassRef} className={styles.compass} aria-hidden="true" />
        <div className={styles.actions}>
          <button type="button" className={styles.iconButton} onClick={() => setMapOpen(true)} aria-label="Open map">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z M9 4v14 M15 6v14" />
            </svg>
          </button>
          <button type="button" className={styles.iconButton} onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16 M4 12h16 M4 17h16" />
            </svg>
          </button>
        </div>
      </header>

      <div className={styles.toasts} role="status">
        {toasts.map((item) => (
          <div key={item.id} className={styles.toast}>
            {item.text}
          </div>
        ))}
      </div>

      {status === "ready" && !overlay && nearName ? (
        <button type="button" className={styles.prompt} data-touch={touch} onClick={() => setPanel(near)}>
          <span className={styles.promptName}>{nearName}</span>
          <span className={styles.promptAction}>{touch ? "Tap to read" : "Press E to read"}</span>
        </button>
      ) : null}

      {status === "ready" && !overlay && !touch && !locked ? (
        <button type="button" className={styles.resume} onClick={resume}>
          Click to look around
        </button>
      ) : null}

      {status === "ready" && !intro ? (
        <div className={styles.hotbar} data-touch={touch} role="toolbar" aria-label="Blocks">
          {inventory.counts.map((count, slot) => (
            <button
              key={slot}
              type="button"
              className={styles.slot}
              data-selected={slot === inventory.selected}
              data-empty={count === 0}
              onClick={() => handle?.selectSlot(slot)}
              aria-label={`${handle?.itemNames[slot] ?? "Block"}, ${count}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={handle?.icons[slot]} alt="" draggable={false} />
              <span>{count}</span>
              {!touch ? <kbd>{slot + 1}</kbd> : null}
            </button>
          ))}
        </div>
      ) : null}

      {panel ? (
        <div className={styles.scrim} onClick={resume}>
          <aside className={styles.panel} onClick={(event) => event.stopPropagation()} aria-live="polite">
            <button type="button" className={styles.close} onClick={resume} aria-label="Close">
              ×
            </button>
            <LandmarkPanel id={panel} content={content} />
            <button type="button" className={styles.primary} onClick={resume}>
              Keep exploring
            </button>
          </aside>
        </div>
      ) : null}

      {mapOpen ? (
        <div className={styles.scrim} onClick={resume}>
          <div className={styles.mapCard} onClick={(event) => event.stopPropagation()}>
            <div className={styles.mapHead}>
              <strong>Island map</strong>
              <span>Tap a discovered landmark to travel there</span>
              <button type="button" className={styles.close} onClick={resume} aria-label="Close map">
                ×
              </button>
            </div>
            <div className={styles.mapFrame}>
              <canvas ref={mapRef} width={672} height={672} />
              {landmarks.map((mark) => {
                const found = discovered.includes(mark.id);
                return (
                  <button
                    key={mark.id}
                    type="button"
                    className={styles.marker}
                    data-found={found}
                    disabled={!found}
                    style={{ left: `${(mark.x / 224) * 100}%`, top: `${(mark.z / 224) * 100}%`, color: mark.color }}
                    onClick={() => {
                      handle?.travel(mark.id);
                      resume();
                    }}
                    aria-label={found ? `Travel to ${labels[mark.id]}` : "Undiscovered landmark"}
                  >
                    <i />
                    <span>{found ? labels[mark.id] : "?"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {menuOpen ? (
        <div className={styles.scrim} onClick={resume}>
          <div className={styles.menu} onClick={(event) => event.stopPropagation()}>
            <h2>Paused</h2>
            <button type="button" className={styles.primary} onClick={resume}>
              Resume
            </button>
            <button type="button" className={styles.secondary} onClick={() => setMuted((value) => !value)}>
              Sound: {muted ? "off" : "on"}
            </button>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => {
                setMenuOpen(false);
                setIntro(true);
              }}
            >
              How to play
            </button>
            <Link className={styles.secondary} href="/play">
              Other games
            </Link>
            <Link className={styles.secondary} href="/">
              Classic homepage
            </Link>
            <button
              type="button"
              className={styles.danger}
              onClick={() => {
                if (window.confirm("Reset the island? Your builds and discoveries will be erased.")) handle?.resetWorld();
              }}
            >
              Reset world
            </button>
          </div>
        </div>
      ) : null}

      {status === "loading" ? (
        <div className={styles.loading}>
          <div className={styles.logo}>Paperlands</div>
          <div className={styles.bar}>
            <span style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <p>Raising an island…</p>
        </div>
      ) : null}

      {status === "error" ? (
        <div className={styles.loading}>
          <div className={styles.logo}>Paperlands</div>
          <p>Your browser could not start the 3D view. Everything is still on the classic page.</p>
          <Link className={styles.primary} href="/">
            Back to the homepage
          </Link>
        </div>
      ) : null}

      {intro && status === "ready" ? (
        <div className={styles.scrim}>
          <div className={styles.intro}>
            <p className={styles.eyebrow}>{content.profile.name} · a voxel expedition</p>
            <h1>Paperlands</h1>
            <p>
              My homepage, folded into an island. Every section is a landmark somewhere out there, and each paper sleeps in its own shrine. Follow the trails
              and the beams of light, dig and build your way through, and find them all.
            </p>
            {touch ? (
              <ul className={styles.keys}>
                <li>
                  <b>Left thumb</b> walk · <b>drag</b> anywhere else to look
                </li>
                <li>
                  <b>Mine</b> hold to dig · <b>Place</b> puts down the selected block
                </li>
                <li>Small ledges are climbed automatically</li>
              </ul>
            ) : (
              <ul className={styles.keys}>
                <li>
                  <kbd>W</kbd>
                  <kbd>A</kbd>
                  <kbd>S</kbd>
                  <kbd>D</kbd> walk · <kbd>Space</kbd> jump · <kbd>Shift</kbd> run
                </li>
                <li>
                  <b>Hold left click</b> dig · <b>right click</b> place · <kbd>1</kbd>–<kbd>7</kbd> pick a block
                </li>
                <li>
                  <kbd>E</kbd> read a landmark · <kbd>M</kbd> map · <kbd>Esc</kbd> free the mouse
                </li>
              </ul>
            )}
            <button type="button" className={styles.primary} onClick={resume}>
              {discovered.length ? "Continue the expedition" : "Start exploring"}
            </button>
            <div className={styles.introLinks}>
              <Link href="/play">Other games</Link>
              <Link href="/">Classic homepage</Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------ panels

function LandmarkPanel({ id, content }: { id: string; content: PlayContent }) {
  const [kind, key] = id.split(":");

  if (kind === "about") {
    return (
      <Body eyebrow="Base Camp · About me" title={content.profile.name}>
        <p className={styles.meta}>
          {content.profile.role} · {content.profile.affiliation}
        </p>
        {content.profile.bio.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </Body>
    );
  }

  if (kind === "links") {
    return (
      <Body eyebrow="Link Gate" title="Step through">
        <div className={styles.links}>
          {content.links.map((link) => (
            <a key={link.id} href={link.href} target={link.external ? "_blank" : undefined} rel={link.external ? "noreferrer" : undefined}>
              {link.label}
            </a>
          ))}
        </div>
      </Body>
    );
  }

  if (kind === "pub") {
    const pub = content.publications[Number(key)];
    if (!pub) return null;
    return (
      <Body eyebrow={`Shrine · ${pub.venue}`} title={pub.title}>
        <p className={styles.meta}>{pub.authors}</p>
        <div className={styles.links}>
          {pub.projectHref ? (
            <a href={pub.projectHref} target={isExternal(pub.projectHref) ? "_blank" : undefined} rel="noreferrer">
              Project page
            </a>
          ) : null}
          {pub.paperHref ? (
            <a href={pub.paperHref} target="_blank" rel="noreferrer">
              Paper
            </a>
          ) : null}
          {pub.codeHref ? (
            <a href={pub.codeHref} target="_blank" rel="noreferrer">
              Code
            </a>
          ) : null}
          <a href="/publications">All publications</a>
        </div>
      </Body>
    );
  }

  if (kind === "posts") {
    return (
      <Body eyebrow="Lighthouse · Posts" title="Things I wrote">
        {content.posts.map((post) => (
          <a key={post.href} className={styles.card} href={post.href}>
            <span className={styles.date}>{post.date}</span>
            <strong>{post.title}</strong>
            <span>{post.description}</span>
          </a>
        ))}
      </Body>
    );
  }

  if (kind === "education") {
    return (
      <Body eyebrow="Academy · Education" title="Where I studied">
        {content.education.map((item) => (
          <div key={item.degree} className={styles.item}>
            <strong>{item.degree}</strong>
            <span>
              {item.institution} · {item.period}
            </span>
            {item.note ? <span className={styles.badge}>{item.note}</span> : null}
          </div>
        ))}
      </Body>
    );
  }

  if (kind === "news") {
    return (
      <Body eyebrow="Notice Board · News" title="Latest updates">
        {content.news.slice(0, 8).map((item) => (
          <div key={`${item.date}-${item.content}`} className={styles.item}>
            <span className={styles.date}>{item.date}</span>
            <span>{item.content}</span>
          </div>
        ))}
      </Body>
    );
  }

  return (
    <Body eyebrow="Summit · Awards" title="You made it to the top">
      {content.awards.map((award) => (
        <div key={`${award.year}-${award.title}`} className={styles.item}>
          <span className={styles.date}>{award.year}</span>
          <span>
            {award.title}
            {award.detail ? ` (${award.detail})` : ""}
          </span>
        </div>
      ))}
    </Body>
  );
}

function Body({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2 className={styles.panelTitle}>{title}</h2>
      <div className={styles.panelBody}>{children}</div>
    </>
  );
}

// ------------------------------------------------------------ touch

function TouchLayer({ handle }: { handle: React.RefObject<ExploreHandle | null> }) {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const stick = useRef<{ id: number; x: number; y: number } | null>(null);
  const looks = useRef(new Map<number, { x: number; y: number }>());
  const RADIUS = 54;

  useEffect(() => {
    const current = handle.current;
    return () => {
      current?.setMove(0, 0);
      current?.setJump(false);
      current?.setMining(false);
    };
  }, [handle]);

  const onDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const leftSide = event.clientX < window.innerWidth * 0.45 && event.clientY > window.innerHeight * 0.3;
    if (leftSide && !stick.current) {
      stick.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      if (baseRef.current) {
        baseRef.current.style.opacity = "1";
        baseRef.current.style.transform = `translate(${event.clientX - RADIUS}px, ${event.clientY - RADIUS}px)`;
      }
      if (knobRef.current) knobRef.current.style.transform = "translate(0px, 0px)";
    } else {
      looks.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
  };

  const onMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const s = stick.current;
    if (s && s.id === event.pointerId) {
      let dx = event.clientX - s.x;
      let dy = event.clientY - s.y;
      const length = Math.hypot(dx, dy);
      if (length > RADIUS) {
        dx = (dx / length) * RADIUS;
        dy = (dy / length) * RADIUS;
      }
      if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
      const dead = length < 8 ? 0 : 1;
      handle.current?.setMove((dx / RADIUS) * dead, (-dy / RADIUS) * dead);
      return;
    }
    const look = looks.current.get(event.pointerId);
    if (look) {
      handle.current?.addLook((event.clientX - look.x) * 2.1, (event.clientY - look.y) * 2.1);
      look.x = event.clientX;
      look.y = event.clientY;
    }
  };

  const onUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (stick.current?.id === event.pointerId) {
      stick.current = null;
      handle.current?.setMove(0, 0);
      if (baseRef.current) baseRef.current.style.opacity = "0";
    }
    looks.current.delete(event.pointerId);
  };

  const hold = (label: string, className: string, set: (held: boolean) => void, glyph: ReactNode) => (
    <button
      type="button"
      aria-label={label}
      className={`${styles.touchButton} ${className}`}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        set(true);
      }}
      onPointerUp={() => set(false)}
      onPointerCancel={() => set(false)}
      onContextMenu={(event) => event.preventDefault()}
    >
      {glyph}
    </button>
  );

  return (
    <>
      <div className={styles.touchLayer} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <div ref={baseRef} className={styles.stick}>
          <div ref={knobRef} className={styles.knob} />
        </div>
        <div className={styles.stickHint} aria-hidden="true" />
      </div>
      <div className={styles.touchButtons}>
        {hold("Jump", styles.jump, (held) => handle.current?.setJump(held), <span>Jump</span>)}
        {hold("Mine", styles.mine, (held) => handle.current?.setMining(held), <span>Mine</span>)}
        <button type="button" aria-label="Place block" className={`${styles.touchButton} ${styles.placeButton}`} onPointerDown={() => handle.current?.place()}>
          <span>Place</span>
        </button>
      </div>
    </>
  );
}
