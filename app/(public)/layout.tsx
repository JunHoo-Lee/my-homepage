import PublicHeader from "./components/PublicHeader";
import "./public-site.css";

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="public-site">
            <PublicHeader />
            {children}
            <footer className="public-footer">
                <div className="public-container public-footer__inner">
                    <div>
                        <strong>Junhoo Lee</strong>
                        <span>Machine learning researcher · Seoul, Korea</span>
                    </div>
                    <p>© 2026 Junhoo Lee</p>
                </div>
            </footer>
        </div>
    );
}
