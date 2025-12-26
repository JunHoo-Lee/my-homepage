'use client';

import React, { useState } from 'react';
import PrivateSidebar from '../Sidebar';
import BottomNav from './BottomNav';
import { Menu } from 'lucide-react';

export default function PrivateShell({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden bg-stone-950 text-stone-200">
            {/* Sidebar (Desktop) */}
            <PrivateSidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <main className="flex-1 overflow-auto custom-scrollbar p-0 pt-8 lg:pt-0 lg:p-8 pb-32 lg:pb-8 w-full max-w-7xl mx-auto px-4 lg:px-8">
                    {children}
                </main>

                {/* Mobile Bottom Navigation */}
                <BottomNav />
            </div>
        </div>
    );
}
