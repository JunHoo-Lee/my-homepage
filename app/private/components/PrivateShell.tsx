'use client';

import { useState } from 'react';
import PrivateSidebar from '../Sidebar';
import { Menu } from 'lucide-react';

export default function PrivateShell({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden bg-stone-950 text-stone-200">
            {/* Sidebar */}
            <PrivateSidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                {/* Mobile Header */}
                <header className="lg:hidden bg-stone-900 border-b border-stone-800 px-4 py-3 flex items-center justify-between z-30">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 text-stone-400 hover:bg-stone-800 hover:text-stone-200 rounded-lg transition-colors"
                    >
                        <Menu size={24} />
                    </button>
                    <span className="font-semibold text-stone-100">Workspace</span>
                    <div className="w-10" /> {/* Spacer for balance */}
                </header>

                <main className="flex-1 overflow-auto custom-scrollbar p-4 lg:p-8 w-full max-w-7xl mx-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
