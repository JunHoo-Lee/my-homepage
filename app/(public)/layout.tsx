import Sidebar from "../components/Sidebar";

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col md:flex-row min-h-screen">
            <Sidebar />
            <main className="flex-1 md:ml-64 p-8 md:p-12 lg:p-20 max-w-4xl">
                {children}
            </main>
        </div>
    );
}
