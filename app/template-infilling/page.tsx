import ProjectShell from "@/app/components/public/ProjectShell";
import { createProjectMetadata } from "@/app/lib/public-content";
import TemplateInfillingProjectPage from "./TemplateInfillingProjectPage";

export const metadata = createProjectMetadata("template-infilling");

export default function Page() {
  return (
    <ProjectShell slug="template-infilling">
      <TemplateInfillingProjectPage />
    </ProjectShell>
  );
}
