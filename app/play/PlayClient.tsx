"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import type { InputState, PlayContent, WorldStats } from "./types";
import type { Area, WorldHandle } from "./world";
import styles from "./play.module.css";

const AREA_LABELS: Record<string, string> = {
  about: "About",
  links: "Links",
  publications: "Publications",
  posts: "Posts",
  education: "Education",
  news: "News",
  awards: "Awards",
  bowling: "Bowling",
  crates: "Crate stack",
};

const STORAGE_KEY = "drive-mode-visited";

type PrimaryAction = { label: string; href: string; external: boolean };

function readVisited(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item in AREA_LABELS) : [];
  } catch {
    return [];
  }
}

function writeVisited(visited: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(visited));
  } catch {
    // storage unavailable (private mode, blocked site data): progress stays in memory
  }
}

function openHref(action: PrimaryAction) {
  if (action.external) window.open(action.href, "_blank", "noopener,noreferrer");
  else window.location.href = action.href;
}

const isExternal = (href: string) => /^https?:\/\//.test(href) || href.endsWith(".pdf");

export default function PlayClient({ content }: { content: PlayContent }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<WorldHandle | null>(null);
  const inputRef = useRef<InputState>({ forward: false, backward: false, left: false, right: false, brake: false });

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [zone, setZone] = useState<string | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [visited, setVisited] = useState<string[]>([]);
  const [stats, setStats] = useState<WorldStats | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [mapOpen, setMapOpen] = useState(false);
  const [touch, setTouch] = useState(false);

  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    setTouch(window.matchMedia("(pointer: coarse)").matches);
    setVisited(readVisited());
  }, []);

  // ------------------------------------------------------------ world
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let handle: WorldHandle | null = null;
    let cancelled = false;

    import("./world")
      .then(({ createWorld }) => {
        if (cancelled) return;
        handle = createWorld(canvas, content, {
          onZoneChange: setZone,
          onAreaVisit: (area) => {
            setVisited((previous) => {
              if (previous.includes(area)) return previous;
              const next = [...previous, area];
              writeVisited(next);
              const total = Object.keys(AREA_LABELS).length;
              showToast(
                next.length === total
                  ? `All ${total} areas explored — thanks for visiting!`
                  : `New area: ${AREA_LABELS[area] ?? area} (${next.length}/${total})`,
              );
              return next;
            });
          },
          onStats: (next) => {
            setStats((previous) => {
              if (previous && next.pinsDown === next.pinsTotal && previous.pinsDown < next.pinsTotal) showToast("STRIKE! All pins down 🎳");
              if (previous && next.cratesMoved === next.cratesTotal && previous.cratesMoved < next.cratesTotal) showToast("Stack cleared! Gradient descended 📦");
              return next;
            });
          },
        });
        worldRef.current = handle;
        setAreas(handle.areas);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        console.error(error);
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
      handle?.dispose();
      worldRef.current = null;
    };
  }, [content, showToast]);

  const pushInput = useCallback((patch: Partial<InputState>) => {
    inputRef.current = { ...inputRef.current, ...patch };
    worldRef.current?.setInput(inputRef.current);
  }, []);

  const primaryAction = useCallback(
    (zoneId: string | null): PrimaryAction | null => {
      if (!zoneId) return null;
      const [kind, key] = zoneId.split(":");
      if (kind === "link") {
        const link = content.links.find((item) => item.id === key);
        return link ? { label: `Open ${link.label}`, href: link.href, external: link.external } : null;
      }
      if (kind === "pub") {
        const pub = content.publications[Number(key)];
        const href = pub?.projectHref ?? pub?.paperHref;
        return href ? { label: pub.projectHref ? "Open project page" : "Open paper", href, external: isExternal(href) } : null;
      }
      if (kind === "post") {
        const post = content.posts[Number(key)];
        return post ? { label: "Read the post", href: post.href, external: false } : null;
      }
      if (kind === "allpubs") return { label: "See all publications", href: "/publications", external: false };
      return null;
    },
    [content],
  );

  // ------------------------------------------------------------ keyboard
  useEffect(() => {
    const keyMap: Record<string, keyof InputState> = {
      ArrowUp: "forward",
      KeyW: "forward",
      ArrowDown: "backward",
      KeyS: "backward",
      ArrowLeft: "left",
      KeyA: "left",
      ArrowRight: "right",
      KeyD: "right",
      Space: "brake",
    };
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const control = keyMap[event.code];
      if (control) {
        event.preventDefault();
        pushInput({ [control]: event.type === "keydown" });
        if (event.type === "keydown") setShowIntro(false);
        return;
      }
      if (event.type !== "keydown") return;
      if (event.code === "Escape") {
        if (mapOpen) setMapOpen(false);
        else window.location.href = "/";
      } else if (event.code === "KeyR") {
        worldRef.current?.reset();
      } else if (event.code === "KeyM") {
        setMapOpen((open) => !open);
      } else if (event.code === "Enter" || event.code === "KeyE") {
        if (showIntro) {
          setShowIntro(false);
          return;
        }
        const action = primaryAction(zone);
        if (action) {
          event.preventDefault();
          openHref(action);
        }
      }
    };
    const onBlur = () => pushInput({ forward: false, backward: false, left: false, right: false, brake: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", onBlur);
    };
  }, [mapOpen, primaryAction, pushInput, showIntro, zone]);

  const teleport = (areaId: string) => {
    worldRef.current?.teleport(areaId);
    setMapOpen(false);
    setShowIntro(false);
    canvasRef.current?.focus();
  };

  const totalAreas = Object.keys(AREA_LABELS).length;
  const action = primaryAction(zone);

  return (
    <div className={styles.root}>
      <canvas ref={canvasRef} className={styles.canvas} tabIndex={0} aria-label="3D world: drive the car to explore the homepage" />

      <header className={styles.topBar}>
        <div className={styles.brand}>
          <strong>{content.profile.name}</strong>
          <span>Drive mode</span>
        </div>
        <div className={styles.topActions}>
          <span className={styles.progress} title="Areas explored">
            🧭 {visited.length}/{totalAreas}
          </span>
          <button type="button" className={styles.button} onClick={() => setMapOpen((open) => !open)} aria-expanded={mapOpen}>
            Map
          </button>
          <Link className={`${styles.button} ${styles.buttonPrimary}`} href="/">
            Classic view
          </Link>
        </div>
      </header>

      {mapOpen && areas.length ? (
        <nav className={styles.map} aria-label="Jump to an area">
          <p>Jump to</p>
          {areas.map((area) => (
            <button key={area.id} type="button" onClick={() => teleport(area.id)}>
              <span>{area.label}</span>
              {visited.includes(area.id) ? <span aria-label="visited">✓</span> : null}
            </button>
          ))}
        </nav>
      ) : null}

      {zone && status === "ready" ? (
        <aside className={styles.panel} aria-live="polite">
          <ZonePanel zoneId={zone} content={content} stats={stats} />
          {action ? (
            <button type="button" className={`${styles.button} ${styles.buttonPrimary} ${styles.panelAction}`} onClick={() => openHref(action)}>
              {action.label} {touch ? "" : <kbd>Enter</kbd>}
            </button>
          ) : null}
        </aside>
      ) : null}

      {toast ? (
        <div className={styles.toast} role="status">
          {toast}
        </div>
      ) : null}

      {status === "loading" ? <div className={styles.center}>Building the world…</div> : null}
      {status === "error" ? (
        <div className={styles.center}>
          <div className={styles.introCard}>
            <h1>Drive mode needs WebGL</h1>
            <p>Your browser could not start the 3D view. Everything is still on the classic page.</p>
            <Link className={`${styles.button} ${styles.buttonPrimary}`} href="/">
              Back to the homepage
            </Link>
          </div>
        </div>
      ) : null}

      {showIntro && status === "ready" ? (
        <div className={styles.center}>
          <div className={styles.introCard}>
            <h1>Drive around my homepage</h1>
            <p>Every section of the page is a place in this little world. Drive up to a sign to read it, and park on a blue pad to open a link.</p>
            {touch ? (
              <ul className={styles.keys}>
                <li>Use the buttons at the bottom to steer and drive</li>
                <li>
                  <b>Map</b> jumps to any area
                </li>
              </ul>
            ) : (
              <ul className={styles.keys}>
                <li>
                  <kbd>W</kbd>
                  <kbd>A</kbd>
                  <kbd>S</kbd>
                  <kbd>D</kbd> or arrow keys: drive
                </li>
                <li>
                  <kbd>Space</kbd> brake · <kbd>R</kbd> reset car
                </li>
                <li>
                  <kbd>Enter</kbd> open what you are parked on
                </li>
                <li>
                  <kbd>M</kbd> map · <kbd>Esc</kbd> classic view
                </li>
              </ul>
            )}
            <button type="button" className={`${styles.button} ${styles.buttonPrimary}`} onClick={() => setShowIntro(false)}>
              Start driving
            </button>
          </div>
        </div>
      ) : null}

      {touch && status === "ready" ? <TouchControls onInput={pushInput} onReset={() => worldRef.current?.reset()} /> : null}
    </div>
  );
}

// ------------------------------------------------------------ panels

function ZonePanel({ zoneId, content, stats }: { zoneId: string; content: PlayContent; stats: WorldStats | null }) {
  const [kind, key] = zoneId.split(":");
  const index = Number(key);

  if (kind === "about") {
    return (
      <PanelBody eyebrow="About me" title={content.profile.name}>
        <p className={styles.meta}>
          {content.profile.role} · {content.profile.affiliation}
        </p>
        {content.profile.bio.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </PanelBody>
    );
  }

  if (kind === "link") {
    const link = content.links.find((item) => item.id === key);
    if (!link) return null;
    return <PanelBody eyebrow="Link pad" title={link.label}><p>Parked on the {link.label} pad.</p></PanelBody>;
  }

  if (kind === "pub") {
    const pub = content.publications[index];
    if (!pub) return null;
    return (
      <PanelBody eyebrow={pub.venue} title={pub.title}>
        <p className={styles.meta}>{pub.authors}</p>
        <div className={styles.links}>
          {pub.projectHref ? <a href={pub.projectHref}>Project</a> : null}
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
        </div>
      </PanelBody>
    );
  }

  if (kind === "allpubs") {
    return (
      <PanelBody eyebrow="Archive" title="All publications">
        <p>The slabs here are my first-author papers. The full list, including workshop and journal papers, is on the publications page.</p>
      </PanelBody>
    );
  }

  if (kind === "post") {
    const post = content.posts[index];
    if (!post) return null;
    return (
      <PanelBody eyebrow={`Post · ${post.date}`} title={post.title}>
        <p>{post.description}</p>
      </PanelBody>
    );
  }

  if (kind === "education") {
    return (
      <PanelBody eyebrow="Education" title="Where I studied">
        {content.education.map((item) => (
          <div key={item.degree} className={styles.item}>
            <strong>{item.degree}</strong>
            <span>
              {item.institution} · {item.period}
            </span>
            {item.note ? <span className={styles.badge}>🏆 {item.note}</span> : null}
          </div>
        ))}
      </PanelBody>
    );
  }

  if (kind === "news") {
    return (
      <PanelBody eyebrow="News" title="Latest updates">
        {content.news.slice(0, 6).map((item) => (
          <div key={`${item.date}-${item.content}`} className={styles.item}>
            <span className={styles.date}>{item.date}</span>
            <span>{item.content}</span>
          </div>
        ))}
      </PanelBody>
    );
  }

  if (kind === "awards") {
    return (
      <PanelBody eyebrow="Awards & honors" title="Trophy hall">
        {content.awards.map((award) => (
          <div key={`${award.year}-${award.title}`} className={styles.item}>
            <span className={styles.date}>{award.year}</span>
            <span>
              {award.title}
              {award.detail ? ` — ${award.detail}` : ""}
            </span>
          </div>
        ))}
      </PanelBody>
    );
  }

  if (kind === "bowling") {
    return (
      <PanelBody eyebrow="Mini game" title="Bowling">
        <p>Line up on the lane and floor it.</p>
        {stats ? (
          <p className={styles.score}>
            Pins down: {stats.pinsDown}/{stats.pinsTotal}
          </p>
        ) : null}
      </PanelBody>
    );
  }

  if (kind === "crates") {
    return (
      <PanelBody eyebrow="Mini game" title="Knock down the stack">
        <p>Ten crates of deep-learning jargon. How many can you scatter?</p>
        {stats ? (
          <p className={styles.score}>
            Crates moved: {stats.cratesMoved}/{stats.cratesTotal}
          </p>
        ) : null}
      </PanelBody>
    );
  }

  return null;
}

function PanelBody({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2 className={styles.panelTitle}>{title}</h2>
      <div className={styles.panelBody}>{children}</div>
    </>
  );
}

// ------------------------------------------------------------ touch

function TouchControls({ onInput, onReset }: { onInput: (patch: Partial<InputState>) => void; onReset: () => void }) {
  const hold = (control: keyof InputState, label: string, glyph: string) => (
    <button
      type="button"
      aria-label={label}
      className={styles.touchButton}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        onInput({ [control]: true });
      }}
      onPointerUp={() => onInput({ [control]: false })}
      onPointerCancel={() => onInput({ [control]: false })}
      onContextMenu={(event) => event.preventDefault()}
    >
      {glyph}
    </button>
  );

  return (
    <div className={styles.touch}>
      <div className={styles.touchGroup}>
        {hold("left", "Steer left", "◀")}
        {hold("right", "Steer right", "▶")}
      </div>
      <button type="button" className={`${styles.touchButton} ${styles.touchSmall}`} onClick={onReset} aria-label="Reset car">
        ↺
      </button>
      <div className={styles.touchGroup}>
        {hold("backward", "Reverse", "▼")}
        {hold("forward", "Accelerate", "▲")}
      </div>
    </div>
  );
}
