import type { Metadata } from "next";

import DsfClient from "./DsfClient";

export const metadata: Metadata = {
  title: "What I Cannot Create: the DSF game | Junhoo Lee",
  description:
    "A blackboard game about the Discriminative Score Function (NeurIPS 2026): play a frozen classifier and make images appear out of noise, starting from Feynman's last blackboard.",
  alternates: { canonical: "/play/dsf" },
  openGraph: {
    title: "What I Cannot Create: the DSF game",
    description: "Make a frozen classifier draw. A game about the Discriminative Score Function.",
    images: [{ url: "/dsf/assets/overview.png" }],
  },
};

export default function DsfGamePage() {
  return <DsfClient />;
}
