'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import RichTextEditor from '@/app/components/RichTextEditor';

export default function JournalPage() {
    const [entries, setEntries] = useState<any[]>([]);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchJournal();
    }, []);

    const fetchJournal = async () => {
        setLoading(true);
        const { data } = await supabase.from('journal').select('*').order('created_at', { ascending: false });
        setEntries(data || []);
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        setError(null);

        // Simple journal entry
        const { error: insertError } = await supabase.from('journal').insert([{ content }]);
        if (!insertError) {
            setContent('');
            fetchJournal();
        } else {
            console.error(insertError);
            setError(insertError.message);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-gray-900">Journal</h1>

            <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="mb-2">
                    <RichTextEditor
                        value={content}
                        onChange={setContent}
                        placeholder="What's on your mind?"
                        minHeight="200px"
                    />
                </div>
                <div className="flex justify-end pt-2 border-t border-gray-100">
                    <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700">
                        Post
                    </button>
                </div>
                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                        {error}
                    </div>
                )}
            </form>

            <div className="space-y-6">
                {loading ? <p>Loading...</p> : entries.map(entry => (
                    <div key={entry.id} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <div className="text-gray-400 text-sm mb-4 font-medium">
                            {new Date(entry.created_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="prose prose-blue max-w-none text-gray-800 prose-img:rounded-lg">
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                {entry.content}
                            </ReactMarkdown>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
