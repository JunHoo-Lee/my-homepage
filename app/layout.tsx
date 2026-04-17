import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Junhoo Lee | SNU MIPAL",
    description: "Personal homepage of Junhoo Lee, PhD student at Seoul National University.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="scroll-smooth">
            <body className="min-h-screen text-stone-950">
                {children}
            </body>
        </html>
    );
}
