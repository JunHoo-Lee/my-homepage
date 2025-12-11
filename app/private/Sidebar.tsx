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
    LogOut
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const MENU_ITEMS = [
    { href: '/private', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/private/tasks', label: 'Tasks', icon: CheckSquare },
    { href: '/private/papers', label: 'Papers', icon: BookOpen },
    { href: '/private/notes', label: 'Notes', icon: FileText },
    { href: '/private/journal', label: 'Journal', icon: PenTool },
    { href: '/private/tags', label: 'Tags', icon: Tags },
];

export default function PrivateSidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        // Simple cookie clear via API or just client side if httpOnly (cannot clear client side).
        // Since cookie is httpOnly, we need an API route to logout or just expiry.
        // For now, we can just redirect to login to override or we need a logout route.
        // I'll skip logout implementation detail for now and just link to home or something.
        // Or assuming we don't need explicit logout button yet as per spec.
        // But I'll add a button visually.
    };

    return (
        <aside className="w-64 bg-gray-900 text-gray-100 min-h-screen flex flex-col fixed left-0 top-0 border-r border-gray-800">
            <div className="p-6">
                <h1 className="text-xl font-bold tracking-wider">PRIVATE</h1>
                <p className="text-xs text-gray-400 mt-1">Personal Workspace</p>
            </div>

            <nav className="flex-1 px-4 space-y-2">
                {MENU_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                }`}
                        >
                            <Icon size={20} />
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-800">
                <Link href="/" className="flex items-center gap-3 px-4 py-2 text-gray-400 hover:text-white transition-colors">
                    <LogOut size={18} />
                    <span className="text-sm">Back to Public</span>
                </Link>
            </div>
        </aside>
    );
}
