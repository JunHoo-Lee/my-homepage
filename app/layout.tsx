import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    metadataBase: new URL("https://junhoo.me"),
    title: "Junhoo Lee | Machine Learning Researcher",
    description:
        "Junhoo Lee is a research fellow at KAIST working with Prof. Jinwoo Shin.",
    alternates: { canonical: "/" },
    openGraph: {
        title: "Junhoo Lee | Machine Learning Researcher",
        description:
            "Junhoo Lee is a research fellow at KAIST working with Prof. Jinwoo Shin.",
        url: "https://junhoo.me",
        siteName: "Junhoo Lee",
        type: "website",
        images: [{ url: "/myface.jpeg", alt: "Junhoo Lee" }],
    },
    twitter: {
        card: "summary",
        title: "Junhoo Lee | Machine Learning Researcher",
        description:
            "Junhoo Lee is a research fellow at KAIST working with Prof. Jinwoo Shin.",
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
            </head>
            <body className="antialiased min-h-screen">
                {children}
            </body>
        </html>
    );
}
