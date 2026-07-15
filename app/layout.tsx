import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
    metadataBase: new URL("https://junhoo.me"),
    title: {
        default: "Junhoo Lee | Foundation Models, Adaptation, and Model Diagnosis",
        template: "%s | Junhoo Lee",
    },
    description:
        "Research homepage of Junhoo Lee at Seoul National University, working on structured inference, adaptation, and diagnosis for foundation models.",
    applicationName: "Junhoo Lee Research",
    authors: [{ name: "Junhoo Lee", url: "https://junhoo.me" }],
    creator: "Junhoo Lee",
    publisher: "Junhoo Lee",
    alternates: {
        canonical: "/",
    },
    openGraph: {
        type: "profile",
        url: "/",
        title: "Junhoo Lee | Research",
        description:
            "Structured inference, adaptation, and diagnosis for foundation models across language, vision, and embodied systems.",
        siteName: "Junhoo Lee",
        locale: "en_US",
        images: [
            {
                url: "/template-infilling/figure-main.png",
                width: 1286,
                height: 552,
                alt: "Selected research by Junhoo Lee",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Junhoo Lee | Research",
        description:
            "Structured inference, adaptation, and diagnosis for foundation models.",
        images: ["/template-infilling/figure-main.png"],
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
        },
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            className="scroll-smooth"
            data-public-theme="light"
            data-scroll-behavior="smooth"
            lang="en"
            suppressHydrationWarning
        >
            <body className="antialiased min-h-screen">
                {children}
                <Script id="public-theme" strategy="beforeInteractive">
                    {`try{var t=localStorage.getItem('junhoo-public-theme');document.documentElement.dataset.publicTheme=t==='dark'?'dark':'light'}catch(e){document.documentElement.dataset.publicTheme='light'}`}
                </Script>
            </body>
        </html>
    );
}
