'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { Loader2, Tag, Trash2, Merge, X } from 'lucide-react';

export default function TagsPage() {
    const [tags, setTags] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTags, setSelectedTags] = useState<string[]>([]); // ids
    const [mergeTarget, setMergeTarget] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchTags();
    }, []);

    const fetchTags = async () => {
        setLoading(true);
        const { data } = await supabase.from('tags').select('*').order('name');
        setTags(data || []);
        setLoading(false);
    };

    const toggleSelect = (id: string) => {
        if (selectedTags.includes(id)) {
            setSelectedTags(selectedTags.filter(t => t !== id));
        } else {
            setSelectedTags([...selectedTags, id]);
        }
    };

    const handleMerge = async () => {
        if (!mergeTarget.trim() || selectedTags.length < 2) return;
        setProcessing(true);
        try {
            await fetch('/api/tags/merge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetName: mergeTarget,
                    sourceIds: selectedTags
                })
            });
            fetchTags();
            setSelectedTags([]);
            setMergeTarget('');
        } catch (e) {
            console.error(e);
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this tag?')) return;
        await fetch(`/api/tags/${id}`, { method: 'DELETE' });
        fetchTags();
    };

    return (
        <div className="max-w-4xl mx-auto space-y-10">
            {/* Header */}
            <div className="flex flex-col gap-2 border-b border-slate-200 pb-8">
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 font-sans">
                    Tags
                </h1>
                <p className="text-lg text-slate-500 font-light">
                    Organize and consolidate your knowledge labels.
                </p>
            </div>

            {/* Merge Control Panel */}
            <div className={`
                bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden transition-all duration-300
                ${selectedTags.length >= 2 ? 'opacity-100 translate-y-0' : 'opacity-60 translate-y-1'}
            `}>
                <div className="bg-indigo-50/50 p-4 border-b border-indigo-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-900 font-medium">
                        <Merge size={18} />
                        <span>Merge Selected Tags</span>
                        <span className="bg-indigo-200 text-indigo-800 text-xs px-2 py-0.5 rounded-full">
                            {selectedTags.length}
                        </span>
                    </div>
                    {selectedTags.length > 0 && (
                        <button
                            onClick={() => setSelectedTags([])}
                            className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                        >
                            <X size={14} /> Clear Selection
                        </button>
                    )}
                </div>
                <div className="p-6 flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            New Tag Name
                        </label>
                        <input
                            value={mergeTarget}
                            onChange={e => setMergeTarget(e.target.value)}
                            placeholder="e.g. 'machine-learning'"
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-900"
                            disabled={selectedTags.length < 2}
                        />
                    </div>
                    <button
                        onClick={handleMerge}
                        disabled={selectedTags.length < 2 || !mergeTarget || processing}
                        className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-2"
                    >
                        {processing ? <Loader2 className="animate-spin" size={18} /> : (
                            <>
                                <span>Merge</span>
                                <Merge size={16} />
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Tags Grid */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900">All Tags ({tags.length})</h2>
                </div>

                {loading ? (
                    <div className="py-20 flex justify-center text-slate-400">
                        <Loader2 className="animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tags.map(tag => {
                            const isSelected = selectedTags.includes(tag.id);
                            return (
                                <div
                                    key={tag.id}
                                    onClick={() => toggleSelect(tag.id)}
                                    className={`
                                        group relative p-4 rounded-xl border cursor-pointer transition-all duration-200 select-none
                                        ${isSelected
                                            ? 'bg-indigo-50 border-indigo-300 shadow-md transform scale-[1.02]'
                                            : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-sm'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`
                                            w-5 h-5 rounded-md border flex items-center justify-center transition-colors
                                            ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}
                                        `}>
                                            {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 font-medium text-slate-700 truncate">
                                                <Tag size={14} className={isSelected ? 'text-indigo-600' : 'text-slate-400'} />
                                                <span className={isSelected ? 'text-indigo-900' : ''}>{tag.name}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(tag.id); }}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            title="Delete tag"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
