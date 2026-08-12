import { PublicHomeFrame } from "@/app/components/public/PublicSiteShell";
import { Montserrat, Mulish } from "next/font/google";

const montserrat = Montserrat({
    subsets: ["latin"],
    weight: ["400", "700"],
    variable: "--font-home-heading",
});

const mulish = Mulish({
    subsets: ["latin"],
    weight: ["400", "900"],
    variable: "--font-home-body",
});

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className={`${montserrat.variable} ${mulish.variable}`}>
            <PublicHomeFrame>{children}</PublicHomeFrame>
        </div>
    );
}
