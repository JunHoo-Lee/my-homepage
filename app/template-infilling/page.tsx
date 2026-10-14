import type { Metadata } from "next";

import TemplateInfillingProjectPage from "./TemplateInfillingProjectPage";

export const metadata: Metadata = {
  alternates: { canonical: "/template-infilling" },
  title: "Template Infilling | Junhoo Lee",
  description:
    "Project page for Unlocking the Potential of Diffusion Language Models through Template Infilling.",
};

export default function Page() {
  return <TemplateInfillingProjectPage />;
}
