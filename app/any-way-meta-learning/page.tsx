import ProjectShell from "@/app/components/public/ProjectShell";
import { createProjectMetadata } from "@/app/lib/public-content";
import AnyWayMetaLearningProjectPage from "./AnyWayMetaLearningProjectPage";

export const metadata = createProjectMetadata("any-way-meta-learning");

export default function Page() {
    return (
        <ProjectShell slug="any-way-meta-learning">
            <AnyWayMetaLearningProjectPage />
        </ProjectShell>
    );
}
