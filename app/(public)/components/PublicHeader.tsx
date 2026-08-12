"use client";

import Link from "next/link";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
    { href: "/#work", label: "Research" },
    { href: "/publications", label: "Publications" },
    { href: "/#talks", label: "Talks" },
    { href: "/#news", label: "News" },
];

export default function PublicHeader() {
    const [menuOpen, setMenuOpen] = useState(false);

    function toggleTheme() {
        const current = document.documentElement.dataset.publicTheme;
        const next = current === "dark" ? "light" : "dark";
        document.documentElement.dataset.publicTheme = next;

        try {
            window.localStorage.setItem("junhoo-public-theme", next);
        } catch {
            // The theme still changes for this page even when storage is unavailable.
        }
    }

    return (
        <header className="public-header">
            <div className="public-header__inner">
                <Link href="/" className="public-brand" onClick={() => setMenuOpen(false)}>
                    Junhoo Lee
                </Link>

                <nav className="public-nav" aria-label="Primary navigation">
                    {NAV_ITEMS.map((item) => (
                        <Link key={item.href} href={item.href}>
                            {item.label}
                        </Link>
                    ))}
                    <a href="/cv.pdf" target="_blank" rel="noopener noreferrer">
                        CV
                    </a>
                </nav>

                <div className="public-header__actions">
                    <button
                        type="button"
                        className="public-icon-button public-theme-toggle"
                        onClick={toggleTheme}
                    >
                        <Moon className="public-theme-toggle__moon" aria-hidden="true" />
                        <Sun className="public-theme-toggle__sun" aria-hidden="true" />
                        <span className="public-theme-toggle__accessible public-theme-toggle__accessible--dark">
                            Switch to dark theme
                        </span>
                        <span className="public-theme-toggle__accessible public-theme-toggle__accessible--light">
                            Switch to light theme
                        </span>
                        <span className="public-theme-toggle__dark-label" aria-hidden="true">Dark</span>
                        <span className="public-theme-toggle__light-label" aria-hidden="true">Light</span>
                    </button>

                    <button
                        type="button"
                        className="public-icon-button public-menu-button"
                        onClick={() => setMenuOpen((open) => !open)}
                        aria-expanded={menuOpen}
                        aria-controls="public-mobile-nav"
                        aria-label={menuOpen ? "Close navigation" : "Open navigation"}
                    >
                        {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
                        <span>Menu</span>
                    </button>
                </div>
            </div>

            {menuOpen && (
                <nav id="public-mobile-nav" className="public-mobile-nav" aria-label="Mobile navigation">
                    {NAV_ITEMS.map((item) => (
                        <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
                            {item.label}
                        </Link>
                    ))}
                    <a href="/cv.pdf" target="_blank" rel="noopener noreferrer">
                        CV
                    </a>
                </nav>
            )}
        </header>
    );
}
