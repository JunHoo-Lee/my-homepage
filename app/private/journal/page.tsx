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
        <div className="max-w-4xl mx-auto space-y-12">
            {/* Header */}
            <div className="flex flex-col gap-2 border-b border-slate-200 pb-8">
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 font-sans">
                    Journal
                </h1>
                <p className="text-lg text-slate-500 font-light">
                    Capture your thoughts, ideas, and reflections.
                </p>
            </div>

            {/* Input Area */}
            <div className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
                <form onSubmit={handleSubmit} className="relative bg-white p-1 rounded-2xl">
                    <div className="bg-slate-50 rounded-xl p-4 sm:p-6 shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 mb-4 text-slate-700 font-semibold text-sm uppercase tracking-wide">
                            <PenLine size={16} className="text-indigo-500" />
                            <span>New Entry</span>
                        </div>
                        <div className="mb-4">
                            <RichTextEditor
                                value={content}
                                onChange={setContent}
                                placeholder="What's on your mind today?"
                                minHeight="200px"
                            />
                        </div>
                        <div className="flex justify-end items-center gap-4">
                            {error && (
                                <span className="text-sm text-red-500 bg-red-50 px-3 py-1 rounded-full">
                                    {error}
                                </span>
                            )}
                            <button
                                type="submit"
                                className="flex items-center gap-2 bg-slate-900 text-white px-8 py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 active:scale-95"
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
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                        <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin"></div>
                        <p className="text-sm font-medium">Loading entries...</p>
                    </div>
                ) : entries.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                        <p className="text-slate-400">No entries yet. Start writing above!</p>
                    </div>
                ) : (
                    entries.map(entry => {
                        const date = new Date(entry.created_at);
                        return (
                            <div key={entry.id} className="relative pl-8 sm:pl-0">
                                {/* Timeline line for desktop */}
                                <div className="hidden sm:block absolute left-[-2rem] top-8 w-px h-full bg-slate-200"></div>
                                <div className="hidden sm:flex absolute left-[-2.4rem] top-8 w-3 h-3 rounded-full bg-slate-300 ring-4 ring-slate-50"></div>

                                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-shadow duration-300">
                                    <div className="flex items-center gap-3 text-slate-400 text-xs font-bold uppercase tracking-wider mb-6 pb-4 border-b border-slate-50">
                                        <Calendar size={14} />
                                        <span>
                                            {date.toLocaleDateString(undefined, {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </span>
                                        <span className="text-slate-300">•</span>
                                        <span>
                                            {date.toLocaleTimeString(undefined, {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                    <div className="prose prose-slate max-w-none prose-p:text-slate-600 prose-headings:text-slate-800 prose-strong:text-slate-800 prose-img:rounded-xl">
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
