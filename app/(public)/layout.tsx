import Sidebar from "../components/Sidebar";

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="relative flex min-h-screen flex-col md:flex-row">
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(31,78,121,0.12),transparent_32%),radial-gradient(circle_at_85%_12%,rgba(31,78,121,0.08),transparent_28%)]" />
            <Sidebar />
            <main className="mx-auto w-full max-w-5xl flex-1 p-5 md:ml-72 md:p-10 lg:p-14">
                {children}
            </main>
        </div>
    );
}
