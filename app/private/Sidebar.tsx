'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    CheckSquare,
    FileText,
    BookOpen,
    PenTool,
    Tags,
    LogOut,
    Twitter,
    X as CloseIcon
} from 'lucide-react';

const MENU_ITEMS = [
    { href: '/private', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/private/tasks', label: 'Tasks', icon: CheckSquare },
    { href: '/private/papers', label: 'Papers', icon: BookOpen },
    { href: '/private/x', label: 'X Feed', icon: Twitter },
    { href: '/private/notes', label: 'Notes', icon: FileText },
    { href: '/private/journal', label: 'Journal', icon: PenTool },
    { href: '/private/tags', label: 'Tags', icon: Tags },
];

interface PrivateSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function PrivateSidebar({ isOpen, onClose }: PrivateSidebarProps) {
    const pathname = usePathname();

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={`fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Sidebar Container */}
            <aside
                className={`
                    fixed lg:static inset-y-0 left-0 z-50
                    w-[280px] bg-stone-900 text-stone-400 flex flex-col h-full border-r border-stone-800
                    transition-transform duration-300 ease-in-out lg:transform-none shadow-xl lg:shadow-none
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                <div className="p-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-stone-100 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-amber-900/20">P</span>
                            Workspace
                        </h1>
                        <p className="text-[10px] text-stone-500 mt-1.5 font-bold tracking-widest uppercase ml-10">Private Area</p>
                    </div>
                    {/* Close button for mobile */}
                    <button
                        onClick={onClose}
                        className="lg:hidden p-2 text-stone-400 hover:text-stone-100 transition-colors"
                    >
                        <CloseIcon size={20} />
                    </button>
                </div>

                <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar py-4">
                    {MENU_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className={`
                                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden
                                    ${isActive
                                        ? 'text-amber-100 shadow-sm'
                                        : 'hover:bg-stone-800 hover:text-stone-200 text-stone-400'
                                    }
                                `}
                            >
                                {isActive && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent pointer-events-none" />
                                )}
                                <Icon
                                    size={20}
                                    className={`relative z-10 transition-colors duration-200 ${isActive ? 'text-amber-400' : 'group-hover:text-stone-200 text-stone-500'}`}
                                    strokeWidth={isActive ? 2.5 : 2}
                                />
                                <span className={`relative z-10 font-medium ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
                                {isActive && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)] relative z-10" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 mt-auto border-t border-stone-800">
                    <Link
                        href="/"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-stone-500 hover:bg-stone-800 hover:text-stone-200 transition-all duration-200 group"
                    >
                        <LogOut size={18} className="group-hover:text-red-400 transition-colors" />
                        <span className="text-sm font-medium">Back to Public</span>
                    </Link>
                </div>
            </aside>
        </>
    );
}
