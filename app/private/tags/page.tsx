'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { Loader2 } from 'lucide-react';

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
        // Supabase doesn't maintain usage_count automatically unless we have triggers.
        // For now, we will just list them. Ideally usage_count should be updated.
        // But the schema had usage_count. We'll ignore accurate usage count for now or run a count query?
        // Let's just fetch all.
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
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900">Tags Management</h1>

            {/* Merge UI */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Merge {selectedTags.length} selected tags into:</label>
                    <input
                        value={mergeTarget}
                        onChange={e => setMergeTarget(e.target.value)}
                        placeholder="New tag name (e.g. 'deep-learning')"
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        disabled={selectedTags.length < 2}
                    />
                </div>
                <button
                    onClick={handleMerge}
                    disabled={selectedTags.length < 2 || !mergeTarget || processing}
                    className="bg-purple-600 text-white px-6 py-2.5 rounded hover:bg-purple-700 disabled:opacity-50"
                >
                    {processing ? <Loader2 className="animate-spin" /> : 'Merge'}
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50 font-medium text-gray-500 flex">
                    <div className="w-10"></div>
                    <div className="flex-1">Tag Name</div>
                    <div className="w-24 text-right">Actions</div>
                </div>
                <div className="divide-y divide-gray-100">
                    {loading ? <div className="p-4">Loading...</div> : tags.map(tag => (
                        <div key={tag.id} className={`flex items-center p-4 hover:bg-gray-50 transition-colors ${selectedTags.includes(tag.id) ? 'bg-blue-50' : ''}`}>
                            <div className="w-10 flex justify-center">
                                <input
                                    type="checkbox"
                                    checked={selectedTags.includes(tag.id)}
                                    onChange={() => toggleSelect(tag.id)}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600"
                                />
                            </div>
                            <div className="flex-1 font-medium text-gray-700">{tag.name}</div>
                            <div className="w-24 text-right">
                                <button
                                    onClick={() => handleDelete(tag.id)}
                                    className="text-red-500 text-sm hover:underline"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
