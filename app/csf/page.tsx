import ProjectShell from "@/app/components/public/ProjectShell";
import { createProjectMetadata } from "@/app/lib/public-content";
import CSFProjectPage from "./CSFProjectPage";

export const metadata = createProjectMetadata("csf");

export default function Page() {
  return (
    <ProjectShell slug="csf">
      <CSFProjectPage />
    </ProjectShell>
  );
}
