import type { Metadata } from "next";
import "./globals.css";
import WebMCPTools from "./components/WebMCPTools";

export const metadata: Metadata = {
    verification: { other: { "naver-site-verification": "14977446e9eaa2b746946e2cf949d7c5edab3e7f" } },
    metadataBase: new URL("https://junhoo.me"),
    title: "Junhoo Lee | Machine Learning Researcher",
    description:
        "Junhoo Lee is a postdoctoral researcher at KAIST working on robot harnesses, looped models, and continual harnessing.",
    alternates: { canonical: "/" },
    openGraph: {
        title: "Junhoo Lee | Machine Learning Researcher",
        description:
            "Junhoo Lee is a postdoctoral researcher at KAIST working on robot harnesses, looped models, and continual harnessing.",
        url: "https://junhoo.me",
        siteName: "Junhoo Lee",
        type: "website",
        images: [{ url: "/myface.jpeg", alt: "Junhoo Lee" }],
    },
    twitter: {
        card: "summary",
        title: "Junhoo Lee | Machine Learning Researcher",
        description:
            "Junhoo Lee is a postdoctoral researcher at KAIST working on robot harnesses, looped models, and continual harnessing.",
        images: ["/myface.jpeg"],
    },
};

const publicThemeScript = `
(() => {
  try {
    const saved = window.localStorage.getItem("junhoo-public-theme");
    document.documentElement.dataset.publicTheme = saved === "dark" ? "dark" : "light";
  } catch {
    document.documentElement.dataset.publicTheme = "light";
  }
})();
`;

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            className="scroll-smooth"
            data-public-theme="light"
            suppressHydrationWarning
        >
            <head>
                <script dangerouslySetInnerHTML={{ __html: publicThemeScript }} />
                {/* discovery hints for AI agents: llms.txt, MCP server, API catalog (RFC 9727) */}
                <link rel="alternate" type="text/markdown" title="LLM-readable summary" href="/llms.txt" />
                <link rel="api-catalog" href="/.well-known/api-catalog" />
                <link rel="mcp-server" href="/mcp" />
            </head>
            <body className="antialiased min-h-screen">
                {children}
                <WebMCPTools />
            </body>
        </html>
    );
}
