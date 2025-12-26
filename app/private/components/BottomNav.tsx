'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    CheckSquare,
    BookOpen,
    Twitter,
    MoreHorizontal,
    PenTool,
    FileText,
    Tags
} from 'lucide-react';
import { useState } from 'react';

const MAIN_ITEMS = [
    { href: '/private', label: 'Home', icon: LayoutDashboard },
    { href: '/private/tasks', label: 'Tasks', icon: CheckSquare },
    { href: '/private/papers', label: 'Papers', icon: BookOpen },
    { href: '/private/x', label: 'X Feed', icon: Twitter },
];

const MORE_ITEMS = [
    { href: '/private/notes', label: 'Notes', icon: FileText },
    { href: '/private/journal', label: 'Stream', icon: PenTool },
    { href: '/private/tags', label: 'Tags', icon: Tags },
];

export default function BottomNav() {
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
            {/* Backdrop for "More" menu */}
            {isMenuOpen && (
                <div
                    className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm z-40 transition-opacity"
                    onClick={() => setIsMenuOpen(false)}
                />
            )}

            {/* "More" Menu Drawer */}
            <div
                className={`
                    absolute bottom-full left-0 right-0 bg-stone-900 border-t border-stone-800 p-4 pb-8 rounded-t-3xl z-50 shadow-2xl transition-transform duration-300 ease-out
                    ${isMenuOpen ? 'translate-y-0' : 'translate-y-full'}
                `}
            >
                <div className="grid grid-cols-3 gap-4">
                    {MORE_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsMenuOpen(false)}
                                className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all ${isActive ? 'bg-amber-500/10 text-amber-500' : 'text-stone-400 active:bg-stone-800'}`}
                            >
                                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Main Tabs Container */}
            <div className="bg-stone-900/80 backdrop-blur-xl border-t border-stone-800/50 flex items-center justify-around px-2 py-3 pb-safe-offset-4">
                {MAIN_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsMenuOpen(false)}
                            className="relative flex flex-col items-center gap-1 group flex-1 py-1"
                        >
                            <div className={`
                                p-2 rounded-xl transition-all duration-300
                                ${isActive ? 'text-amber-400 scale-110' : 'text-stone-500 group-active:scale-95'}
                            `}>
                                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className={`text-[10px] font-bold transition-colors ${isActive ? 'text-amber-200' : 'text-stone-600'}`}>
                                {item.label}
                            </span>
                            {isActive && (
                                <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                            )}
                        </Link>
                    );
                })}

                {/* More Button */}
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="relative flex flex-col items-center gap-1 group flex-1 py-1"
                >
                    <div className={`
                        p-2 rounded-xl transition-all duration-300
                        ${isMenuOpen ? 'text-amber-400 scale-110' : 'text-stone-500 group-active:scale-95'}
                    `}>
                        <MoreHorizontal size={24} />
                    </div>
                    <span className={`text-[10px] font-bold transition-colors ${isMenuOpen ? 'text-amber-200' : 'text-stone-600'}`}>
                        More
                    </span>
                </button>
            </div>

            {/* iOS Home Indicator Overlay (Safety) */}
            <div className="h-[21px] bg-stone-900/80 backdrop-blur-xl" />
        </nav>
    );
}
