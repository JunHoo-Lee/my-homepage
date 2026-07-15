import type { Metadata } from "next";

import AnyWayMetaLearningProjectPage from "./AnyWayMetaLearningProjectPage";

export const metadata: Metadata = {
    title: "Any-Way Meta Learning | Junhoo Lee",
    description:
        "Project page for Any-Way Meta Learning, an AAAI 2024 paper on breaking the fixed N-way constraint in episodic meta-learning.",
};

export default function Page() {
    return <AnyWayMetaLearningProjectPage />;
}
