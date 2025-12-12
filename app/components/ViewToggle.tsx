'use client';

import { LayoutList, LayoutGrid } from 'lucide-react';

interface ViewToggleProps {
    view: 'list' | 'card';
    onChange: (view: 'list' | 'card') => void;
}

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
    return (
        <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button
                onClick={() => onChange('list')}
                className={`p-1.5 rounded-md transition-all ${view === 'list' ? 'bg-white shadow text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
                title="List View"
            >
                <LayoutList size={18} />
            </button>
            <button
                onClick={() => onChange('card')}
                className={`p-1.5 rounded-md transition-all ${view === 'card' ? 'bg-white shadow text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
                title="Card View"
            >
                <LayoutGrid size={18} />
            </button>
        </div>
    );
}
