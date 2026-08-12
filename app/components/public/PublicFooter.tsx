import styles from "./PublicChrome.module.css";

export default function PublicFooter() {
  return (
    <footer className={styles.footer}>
      <span>© {new Date().getFullYear()} Junhoo Lee</span>
      <div className={styles.footerLinks}>
        <a href="mailto:mrjunoo@snu.ac.kr">Email</a>
        <a href="https://github.com/JunHoo-Lee" target="_blank" rel="noreferrer">
          GitHub
        </a>
        <a
          href="https://scholar.google.com/citations?user=CvvfGxkAAAAJ"
          target="_blank"
          rel="noreferrer"
        >
          Google Scholar
        </a>
      </div>
    </footer>
  );
}
