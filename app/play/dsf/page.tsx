import type { Metadata, Viewport } from "next";
import { preload } from "react-dom";

import DsfClient from "./DsfClient";

export const metadata: Metadata = {
  title: "What I Cannot Create: an island mystery about DSF | Junhoo Lee",
  description:
    "“What I cannot create, I do not understand.” A classifier cannot create. Does it understand nothing? Walk an island in a sea of static and solve eight puzzles to answer it: the Discriminative Score Function (NeurIPS 2026) as a 16-bit adventure.",
  alternates: { canonical: "/play/dsf" },
  openGraph: {
    title: "What I Cannot Create: an island mystery",
    description: "A classifier cannot create. Does it understand nothing? Eight puzzles and a door.",
    images: [{ url: "/dsf/assets/overview.png" }],
  },
};

/* The game fills the screen, notch included; the interface keeps inside the safe area by itself. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0e1226",
};

export default function DsfGamePage() {
  // the title is set in the pixel face and the first portrait appears a few seconds in: fetch them with the page
  preload("/fonts/jersey-10/Jersey10-Regular.ttf", { as: "font", type: "font/ttf", crossOrigin: "anonymous" });
  preload("/fonts/dm-sans/DMSans-Latin.woff2", { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  preload("/play/dsf/ui/faces.png", { as: "image" });
  preload("/play/dsf/ui/win-slate.png", { as: "image" });
  return <DsfClient />;
}
