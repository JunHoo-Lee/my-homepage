import type { Metadata } from "next";

import SHOTProjectPage from "./SHOTProjectPage";

export const metadata: Metadata = {
  title: "SHOT | Junhoo Lee",
  description:
    "Project page for SHOT: Suppressing the Hessian along the Optimization Trajectory for Gradient-Based Meta-Learning.",
};

export default function Page() {
  return <SHOTProjectPage />;
}
