import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";

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
                <div className="flex min-h-screen font-sans">
                    <Sidebar />
                    <main className="flex-1 md:ml-64 w-full">
                        <div className="max-w-4xl mx-auto px-6 py-12">
                            {children}
                        </div>
                    </main>
                </div>
            </body>
        </html>
    );
}
