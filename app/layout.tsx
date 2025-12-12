import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
            <body className={`${inter.className} bg-white text-gray-900 antialiased min-h-screen`}>
                {children}
            </body>
        </html>
    );
}
