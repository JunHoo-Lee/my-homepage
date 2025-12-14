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
                className={`fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Sidebar Container */}
            <aside
                className={`
                    fixed lg:static inset-y-0 left-0 z-50
                    w-[280px] bg-slate-950 text-slate-300 flex flex-col h-full border-r border-slate-800
                    transition-transform duration-300 ease-in-out lg:transform-none
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                <div className="p-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white text-sm">P</span>
                            Workspace
                        </h1>
                        <p className="text-xs text-slate-500 mt-1 font-medium tracking-wide ml-10">PRIVATE AREA</p>
                    </div>
                    {/* Close button for mobile */}
                    <button
                        onClick={onClose}
                        className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors"
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
                                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                                    ${isActive
                                        ? 'bg-indigo-600/10 text-indigo-400 shadow-sm'
                                        : 'hover:bg-slate-900 hover:text-slate-100 text-slate-400'
                                    }
                                `}
                            >
                                <Icon
                                    size={20}
                                    className={`transition-colors duration-200 ${isActive ? 'text-indigo-400' : 'group-hover:text-slate-100 text-slate-500'}`}
                                    strokeWidth={isActive ? 2.5 : 2}
                                />
                                <span className={`font-medium ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
                                {isActive && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 mt-auto border-t border-slate-900">
                    <Link
                        href="/"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-900 hover:text-white transition-all duration-200 group"
                    >
                        <LogOut size={18} className="group-hover:text-red-400 transition-colors" />
                        <span className="text-sm font-medium">Back to Public</span>
                    </Link>
                </div>
            </aside>
        </>
    );
}
