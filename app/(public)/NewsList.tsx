"use client";

import { useState } from "react";

import type { NewsItem } from "@/app/lib/public-content";

import styles from "./HomePage.module.css";

const PREVIEW_COUNT = 4;

export default function NewsList({ news }: { news: readonly NewsItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const visibleNews = expanded ? news : news.slice(0, PREVIEW_COUNT);

  return (
    <>
      <div className={styles.newsList}>
        {visibleNews.map((item) => (
          <article key={`${item.date}-${item.content}`}>
            <time>{item.date}</time>
            <p>{item.content}</p>
          </article>
        ))}
      </div>
      {news.length > PREVIEW_COUNT ? (
        <button
          aria-expanded={expanded}
          className={styles.newsToggle}
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          {expanded ? "Show less" : `Show all news (${news.length})`}
        </button>
      ) : null}
    </>
  );
}
