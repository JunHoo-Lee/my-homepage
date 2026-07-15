import ProjectShell from "@/app/components/public/ProjectShell";
import { createProjectMetadata } from "@/app/lib/public-content";
import DSVProjectPage from "./DSVProjectPage";

export const metadata = createProjectMetadata("dsv");

export default function Page() {
  return (
    <ProjectShell slug="dsv">
      <DSVProjectPage />
    </ProjectShell>
  );
}
