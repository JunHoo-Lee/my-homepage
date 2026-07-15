'use client';

import { LayoutList, LayoutGrid } from 'lucide-react';

interface ViewToggleProps {
    view: 'list' | 'card';
    onChange: (view: 'list' | 'card') => void;
}

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
    return (
        <div className="flex bg-stone-900 p-1 rounded-xl border border-stone-800 shadow-inner">
            <button
                onClick={() => onChange('list')}
                className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-stone-800 text-amber-500 shadow-lg ring-1 ring-stone-700' : 'text-stone-500 hover:text-stone-300'}`}
                title="List View"
            >
                <LayoutList size={20} />
            </button>
            <button
                onClick={() => onChange('card')}
                className={`p-2 rounded-lg transition-all ${view === 'card' ? 'bg-stone-800 text-amber-500 shadow-lg ring-1 ring-stone-700' : 'text-stone-500 hover:text-stone-300'}`}
                title="Card View"
            >
                <LayoutGrid size={20} />
            </button>
        </div>
    );
}
