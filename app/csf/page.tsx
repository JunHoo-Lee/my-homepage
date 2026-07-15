import type { Metadata } from "next";

import CSFProjectPage from "./CSFProjectPage";

export const metadata: Metadata = {
  title: "CSF | Junhoo Lee",
  description:
    "Project page for CSF: Black-box Fingerprinting via Compositional Semantics for Text-to-Image Models.",
};

export default function Page() {
  return <CSFProjectPage />;
}
