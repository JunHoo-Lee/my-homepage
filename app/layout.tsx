import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const sourceSans = localFont({
    src: [
        {
            path: "./fonts/SourceSans3-Variable.ttf",
            weight: "200 900",
            style: "normal",
        },
    ],
    variable: "--font-source-sans",
    display: "swap",
});

const sourceSerif = localFont({
    src: [
        {
            path: "./fonts/SourceSerif4-Variable.ttf",
            weight: "200 900",
            style: "normal",
        },
    ],
    variable: "--font-source-serif",
    display: "swap",
});

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
            <body className={`${sourceSans.variable} ${sourceSerif.variable} min-h-screen antialiased`}>
                {children}
            </body>
        </html>
    );
}
