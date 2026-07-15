import { PublicHomeFrame } from "@/app/components/public/PublicSiteShell";

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <PublicHomeFrame>{children}</PublicHomeFrame>;
}
