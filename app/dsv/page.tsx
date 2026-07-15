import type { Metadata } from "next";

import DSVProjectPage from "./DSVProjectPage";

export const metadata: Metadata = {
  title: "Deep Support Vectors | Junhoo Lee",
  description:
    "Project page for Deep Support Vectors, using TeX-source figures, submit_code reproduction details, and an HTML rebuild of the few-shot distillation table.",
};

export default function Page() {
  return <DSVProjectPage />;
}
