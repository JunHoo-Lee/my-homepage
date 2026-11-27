import type { Metadata } from "next";

import PlayClient from "../PlayClient";
import { buildPlayContent } from "../content";

export const metadata: Metadata = {
  title: "Drive Mode | Junhoo Lee",
  description: "Explore Junhoo Lee's homepage by driving a little car around a 3D world.",
  alternates: { canonical: "/play/drive" },
};

export default function DrivePage() {
  return <PlayClient content={buildPlayContent()} />;
}
