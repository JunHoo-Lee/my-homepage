"use client";

import { createContext, useContext, type PointerEvent } from "react";

import type { SfxName } from "../contracts";

/** UI sounds for the overlays. SurvivorsClient provides the live engine. */
export type UiSound = {
  play: (name: SfxName) => void;
  /** Spread onto buttons, links and cards: "hover" on mouse-over or when reached with Tab. */
  hover: { onPointerEnter: (event: PointerEvent) => void; onFocus: () => void };
};

const noop = () => {};

export const UiSoundContext = createContext<UiSound>({ play: noop, hover: { onPointerEnter: noop, onFocus: noop } });

export const useUiSound = () => useContext(UiSoundContext);
