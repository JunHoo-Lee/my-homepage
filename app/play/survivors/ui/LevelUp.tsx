"use client";

import { useEffect, useRef, type CSSProperties } from "react";

import type { Card } from "../game";
import { CardIcon, PaperIcon, isCardIconId } from "../icons";
import { CARD_FLAVOR, SCREENS } from "../lore";
import kit from "./kit.module.css";
import styles from "./levelup.module.css";
import { useUiSound } from "./sound";

type Props = {
  cards: Card[];
  touch: boolean;
  onPick: (card: Card) => void;
};

/** Cards that can level up this far show their progress as pips. */
const MAX_PIPS = 5;

const tone = (card: Card) => (card.id === "checkpoint" ? styles.heal : card.kind === "weapon" ? styles.weapon : styles.passive);

export default function LevelUp({ cards, touch, onPick }: Props) {
  const ui = useUiSound();
  const panelRef = useRef<HTMLElement>(null);

  // focus the dialog, not a card: no card looks pre-selected and a stray Enter picks nothing
  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className={`${kit.overlay} ${styles.backdrop}`}>
      <section ref={panelRef} className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="gs-levelup" tabIndex={-1}>
        <p className={styles.kicker}>{SCREENS.levelUpKicker}</p>
        <h2 id="gs-levelup" className={styles.title}>
          {SCREENS.levelUpTitle}
        </h2>
        <div className={styles.cards}>
          {cards.map((card, index) => {
            const icon = isCardIconId(card.id) ? card.id : null;
            return (
              <button
                key={card.id}
                type="button"
                className={`${styles.card} ${tone(card)} ${card.paper ? styles.isPaper : ""}`}
                style={{ "--i": index } as CSSProperties}
                onClick={() => onPick(card)}
                aria-keyshortcuts={String(index + 1)}
                {...ui.hover}
              >
                <span className={styles.icon} aria-hidden="true">
                  {icon ? <CardIcon id={icon} /> : card.icon}
                </span>
                <span className={styles.badge}>
                  {card.maxLevel <= MAX_PIPS && card.maxLevel > 1 ? (
                    <span className={styles.pips} aria-hidden="true">
                      {Array.from({ length: card.maxLevel }, (_, pip) => (
                        <i key={pip} className={pip + 1 === card.level ? styles.pipNew : pip < card.level ? styles.pipOn : undefined} />
                      ))}
                    </span>
                  ) : null}
                  <span className={card.level === 1 ? styles.new : styles.level}>{card.level === 1 ? "NEW" : `Lv ${card.level}`}</span>
                </span>
                <strong className={styles.name}>{card.name}</strong>
                <span className={styles.text}>{card.text}</span>
                {icon ? <em className={styles.flavor}>{CARD_FLAVOR[icon]}</em> : null}
                {card.paper ? (
                  <span className={styles.paper}>
                    <PaperIcon />
                    <span>Paper: {card.paper.label}</span>
                  </span>
                ) : null}
                {touch ? null : (
                  <span className={`${kit.key} ${styles.key}`} aria-hidden="true">
                    {index + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
