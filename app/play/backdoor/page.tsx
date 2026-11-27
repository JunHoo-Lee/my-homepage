import type { Metadata } from "next";

import BackdoorClient from "./BackdoorClient";

export const metadata: Metadata = {
  title: "Nothing to Declare: the clean-data backdoor game | Junhoo Lee",
  description:
    "A customs game about “Clean Data Can Still Carry Backdoors” (NeurIPS 2026): inspect a distillation transfer set, clear only clean images, and watch the student get backdoored anyway.",
  alternates: { canonical: "/play/backdoor" },
  openGraph: {
    title: "Nothing to Declare: the clean-data backdoor game",
    description: "Every image was clean. The student is backdoored anyway. A game about support-persistent backdoors.",
    images: [{ url: "/backdoor/assets/overview.png" }],
  },
};

export default function BackdoorGamePage() {
  return <BackdoorClient />;
}
