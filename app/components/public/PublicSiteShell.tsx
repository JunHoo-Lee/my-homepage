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
    <div className={`${styles.shell} ${styles.homeShell}`}>
      <a className={styles.skipLink} href="#public-content">
        Skip to content
      </a>
      <main className={styles.homeMain} id="public-content">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
