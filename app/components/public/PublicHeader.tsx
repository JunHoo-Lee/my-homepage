"use client";

import Link from "next/link";
import { useState } from "react";

import styles from "./PublicChrome.module.css";

const links = [
  { href: "/#research", label: "Research" },
  { href: "/#projects", label: "Projects" },
  { href: "/#publications", label: "Publications" },
  { href: "/#news", label: "News" },
];

export default function PublicHeader({ project = false }: { project?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);

  function toggleTheme() {
    const nextTheme =
      document.documentElement.dataset.publicTheme === "dark" ? "light" : "dark";
    document.documentElement.dataset.publicTheme = nextTheme;
    window.localStorage.setItem("junhoo-public-theme", nextTheme);
  }

  return (
    <>
      <a className={styles.skipLink} href="#public-content">
        Skip to content
      </a>
      <header className={`${styles.header} ${project ? styles.headerProject : ""}`}>
        <div className={styles.headerInner}>
          <Link className={styles.identity} href="/" onClick={() => setMenuOpen(false)}>
            <span className={styles.name}>Junhoo Lee</span>
            <span className={styles.role}>Researcher · SNU MIPAL</span>
          </Link>

          <nav className={styles.nav} aria-label="Primary navigation">
            {links.map((link) => (
              <Link className={styles.navLink} href={link.href} key={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className={styles.actions}>
            <a className={styles.cvLink} href="/cv.pdf" target="_blank" rel="noreferrer">
              CV ↗
            </a>
            <button
              aria-label="Toggle color theme"
              className={styles.themeButton}
              onClick={toggleTheme}
              type="button"
            >
              Theme
            </button>
            <button
              aria-controls="mobile-public-nav"
              aria-expanded={menuOpen}
              aria-label="Toggle navigation"
              className={styles.menuButton}
              onClick={() => setMenuOpen((open) => !open)}
              type="button"
            >
              <span className={styles.menuLines} aria-hidden="true" />
            </button>
          </div>
        </div>

        <nav
          aria-label="Mobile navigation"
          className={styles.mobileNav}
          hidden={!menuOpen}
          id="mobile-public-nav"
        >
          {links.map((link) => (
            <Link href={link.href} key={link.href} onClick={() => setMenuOpen(false)}>
              {link.label}
            </Link>
          ))}
          <a href="/cv.pdf" target="_blank" rel="noreferrer" onClick={() => setMenuOpen(false)}>
            CV
          </a>
        </nav>
      </header>
    </>
  );
}
