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
    { href: '/private/tasks', label: 'Tasks', icon: CheckSquare },
    { href: '/private/papers', label: 'Papers', icon: BookOpen },
    { href: '/private/x', label: 'X Feed', icon: Twitter },
    { href: '/private/journal', label: 'Stream', icon: PenTool },
    { href: '/private/notes', label: 'Notes', icon: FileText },
];

export default function BottomNav() {
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">

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

            </div>

            {/* iOS Home Indicator Overlay (Safety) */}
            <div className="h-[21px] bg-stone-900/80 backdrop-blur-xl" />
        </nav>
    );
}
