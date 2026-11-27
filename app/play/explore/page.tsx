import type { Metadata, Viewport } from "next";

import { buildPlayContent } from "../content";
import ExploreClient from "./ExploreClient";

export const metadata: Metadata = {
  title: "Paperlands | Junhoo Lee",
  description: "A voxel island where every section of Junhoo Lee's homepage is a landmark to discover. Dig, build and explore, on desktop or phone.",
  alternates: { canonical: "/play/explore" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#151a2c",
};

export default function ExplorePage() {
  return <ExploreClient content={buildPlayContent()} />;
}
