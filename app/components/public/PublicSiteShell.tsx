import type { ReactNode } from "react";

import PublicFooter from "./PublicFooter";
import PublicHeader from "./PublicHeader";
import styles from "./PublicChrome.module.css";

export default function PublicSiteShell({
  children,
  project = false,
}: {
  children: ReactNode;
  project?: boolean;
}) {
  return (
    <div className={styles.shell}>
      <PublicHeader project={project} />
      {children}
    </div>
  );
}

export function PublicHomeFrame({ children }: { children: ReactNode }) {
  return (
    <PublicSiteShell>
      <main className={styles.homeMain} id="public-content">
        {children}
      </main>
      <PublicFooter />
    </PublicSiteShell>
  );
}
