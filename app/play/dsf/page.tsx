import type { Metadata } from "next";

import DsfClient from "./DsfClient";

export const metadata: Metadata = {
  title: "What I Cannot Create: an island mystery about DSF | Junhoo Lee",
  description:
    "“What I cannot create, I do not understand.” A classifier cannot create. Does it understand nothing? Explore an island in a sea of static and solve eight puzzles to answer it: the Discriminative Score Function (NeurIPS 2026) as a game.",
  alternates: { canonical: "/play/dsf" },
  openGraph: {
    title: "What I Cannot Create: an island mystery",
    description: "A classifier cannot create. Does it understand nothing? Eight puzzles and a door.",
    images: [{ url: "/dsf/assets/overview.png" }],
  },
};

export default function DsfGamePage() {
  return <DsfClient />;
}
