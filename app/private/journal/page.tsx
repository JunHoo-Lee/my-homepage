'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import RichTextEditor from '@/app/components/RichTextEditor';
import { Calendar, PenLine, Send } from 'lucide-react';

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
        <div className="max-w-4xl mx-auto space-y-12 pb-20">
            {/* Header */}
            <div className="flex flex-col gap-2 border-b border-stone-800 pb-8">
                <h1 className="text-3xl font-bold tracking-tight text-stone-100">
                    Journal
                </h1>
                <p className="text-lg text-stone-400">
                    Capture your thoughts, ideas, and reflections.
                </p>
            </div>

            {/* Input Area */}
            <div className="group relative">
                {/* Glow effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/20 to-orange-600/20 rounded-3xl opacity-0 group-hover:opacity-100 transition duration-500 blur-xl"></div>

                <form onSubmit={handleSubmit} className="relative z-10">
                    <div className="bg-stone-900 rounded-2xl p-6 border border-stone-800 shadow-sm transition-all hover:border-stone-700">
                        <div className="flex items-center gap-2 mb-4 text-amber-500 font-bold text-xs uppercase tracking-widest">
                            <PenLine size={14} />
                            <span>New Entry</span>
                        </div>
                        <div className="mb-4 bg-stone-950 rounded-xl border border-stone-800 overflow-hidden">
                            <RichTextEditor
                                value={content}
                                onChange={setContent}
                                placeholder="What's on your mind today?"
                                minHeight="200px"
                            />
                        </div>
                        <div className="flex justify-end items-center gap-4">
                            {error && (
                                <span className="text-sm text-red-400 bg-red-900/20 px-3 py-1 rounded-full border border-red-500/20">
                                    {error}
                                </span>
                            )}
                            <button
                                type="submit"
                                className="flex items-center gap-2 bg-amber-600 text-stone-100 px-8 py-2.5 rounded-lg font-medium hover:bg-amber-500 transition-all shadow-lg shadow-amber-900/20 active:scale-95"
                            >
                                <Send size={16} />
                                <span>Post Entry</span>
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* Entries Feed */}
            <div className="space-y-8">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-8 h-8 border-4 border-stone-800 border-t-amber-500 rounded-full animate-spin"></div>
                        <p className="text-sm font-medium text-stone-500">Loading entries...</p>
                    </div>
                ) : entries.length === 0 ? (
                    <div className="text-center py-20 bg-stone-900/50 rounded-2xl border border-dashed border-stone-800">
                        <p className="text-stone-400">No entries yet. Start writing above!</p>
                    </div>
                ) : (
                    entries.map(entry => {
                        const date = new Date(entry.created_at);
                        return (
                            <div key={entry.id} className="relative pl-8 sm:pl-0">
                                {/* Timeline line for desktop */}
                                <div className="hidden sm:block absolute left-[-2rem] top-8 w-px h-full bg-stone-800"></div>
                                <div className="hidden sm:flex absolute left-[-2.35rem] top-8 w-3 h-3 rounded-full bg-stone-700 border-2 border-stone-950"></div>

                                <div className="bg-stone-900 p-6 sm:p-8 rounded-2xl border border-stone-800 shadow-sm hover:shadow-xl hover:border-stone-700 transition-all duration-300">
                                    <div className="flex items-center gap-3 text-stone-500 text-xs font-bold uppercase tracking-wider mb-6 pb-4 border-b border-stone-800">
                                        <Calendar size={14} />
                                        <span>
                                            {date.toLocaleDateString(undefined, {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </span>
                                        <span className="text-stone-700">•</span>
                                        <span>
                                            {date.toLocaleTimeString(undefined, {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                    <div className="prose prose-invert prose-stone max-w-none prose-p:text-stone-300 prose-headings:text-stone-200 prose-strong:text-stone-200 prose-img:rounded-xl">
                                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                            {entry.content}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
