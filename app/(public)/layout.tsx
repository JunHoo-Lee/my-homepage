import Sidebar from "../components/Sidebar";

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col md:flex-row min-h-screen">
            <Sidebar />
            <main className="flex-1 md:ml-64 px-6 py-8 md:px-10 md:py-12 lg:px-14 lg:py-16">
                <div className="mx-auto w-full max-w-6xl">
                    {children}
                </div>
            </main>
        </div>
    );
}
