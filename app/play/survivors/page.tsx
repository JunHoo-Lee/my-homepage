import type { Metadata } from "next";

import { buildPaperLinks } from "../content";
import SurvivorsClient from "./SurvivorsClient";

export const metadata: Metadata = {
  title: "Gradient Survivors | Junhoo Lee",
  description: "A five-minute survivors-like: a tiny model fights NaNs, overfitting and hallucinations, then Reviewer 2. Some upgrades are Junhoo Lee's papers.",
  alternates: { canonical: "/play/survivors" },
};

export default function SurvivorsPage() {
  return <SurvivorsClient paperLinks={buildPaperLinks()} />;
}
