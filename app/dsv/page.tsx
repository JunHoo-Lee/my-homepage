import type { Metadata } from "next";

import DSVProjectPage from "./DSVProjectPage";

export const metadata: Metadata = {
  title: "Deep Support Vectors | Junhoo Lee",
  description:
    "Project page for Deep Support Vectors, a NeurIPS 2024 paper on DeepKKT, few-shot distillation, and classifier-driven generation.",
};

export default function Page() {
  return <DSVProjectPage />;
}
