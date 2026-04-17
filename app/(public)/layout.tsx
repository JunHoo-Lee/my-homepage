import Sidebar from "../components/Sidebar";

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen md:flex">
            <Sidebar />
            <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6 md:ml-[19rem] md:px-10 md:py-10 lg:px-14 lg:py-14">
                <div className="mx-auto w-full max-w-[88rem]">
                    {children}
                </div>
            </main>
        </div>
    );
}
