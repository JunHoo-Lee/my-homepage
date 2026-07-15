import ProjectShell from "@/app/components/public/ProjectShell";
import { createProjectMetadata } from "@/app/lib/public-content";
import SHOTProjectPage from "./SHOTProjectPage";

export const metadata = createProjectMetadata("shot");

export default function Page() {
  return (
    <ProjectShell slug="shot">
      <SHOTProjectPage />
    </ProjectShell>
  );
}
