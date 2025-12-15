'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { Loader2, Plus, FileText, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import RichTextEditor from '@/app/components/RichTextEditor';
import Backlinks from '@/app/components/Backlinks';
import ViewToggle from '@/app/components/ViewToggle';

export default function NotesPage() {
    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'list' | 'edit'>('list'); // Main mode: list or edit note
    const [viewType, setViewType] = useState<'list' | 'card'>('card'); // Display mode for list
    const [currentNote, setCurrentNote] = useState<any>(null);
    const [input, setInput] = useState(''); // for fleeting note
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchNotes();
    }, []);

    const fetchNotes = async () => {
        setLoading(true);
        const { data } = await supabase.from('notes').select('*').order('updated_at', { ascending: false });
        setNotes(data || []);
        setLoading(false);
    };

    const handleFleetingNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        setProcessing(true);
        setError(null);
        try {
            const res = await fetch('/api/ai/parse-note', {
                method: 'POST',
                body: JSON.stringify({ input })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to parse note');

            const { note } = data;
            if (note) {
                // Insert
                const { data: insertData, error: insertError } = await supabase.from('notes').insert([note]).select().single();
                if (insertError) throw insertError;

                if (insertData) {
                    setNotes([insertData, ...notes]);
                    setCurrentNote(insertData);
                    setView('edit');
                    setInput('');
                }
            }
        } catch (e: any) {
            console.error(e);
            setError(e.message || 'An error occurred');
        } finally {
            setProcessing(false);
        }
    };

    const handleSave = async () => {
        if (!currentNote) return;
        await supabase.from('notes').update({
            content: currentNote.content,
            title: currentNote.title,
            tags: currentNote.tags,
            updated_at: new Date()
        }).eq('id', currentNote.id);
        setView('list');
        fetchNotes();
    };

    return (
        <div className="space-y-6">
            {view === 'list' && (
                <>
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold text-stone-100">Notes</h1>
                        <ViewToggle view={viewType} onChange={setViewType} />
                    </div>

                    {/* Fleeting Note Input */}
                    <div className="bg-stone-900 p-6 rounded-xl shadow-sm border border-stone-800">
                        <h2 className="text-sm font-semibold text-stone-500 mb-2 uppercase">New Fleeting Note</h2>
                        <form onSubmit={handleFleetingNote}>
                            <textarea
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder="Write a thought... (AI will format it)"
                                className="w-full p-4 bg-stone-950 border border-stone-800 rounded-lg text-stone-200 placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-900/50 min-h-[100px]"
                                disabled={processing}
                            />
                            <div className="flex justify-end mt-2">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="bg-stone-100 text-stone-900 px-6 py-2 rounded-lg font-medium hover:bg-white transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {processing ? <Loader2 className="animate-spin" /> : <SparklesIcon />} Process & Save
                                </button>
                            </div>
                            {error && (
                                <div className="mt-4 p-3 bg-red-900/20 border border-red-500/20 text-red-400 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}
                        </form>
                    </div>

                    {loading ? <p className="text-stone-500">Loading...</p> : (
                        <div className={viewType === 'card' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "flex flex-col gap-2"}>
                            {notes.map(note => (
                                <div
                                    key={note.id}
                                    onClick={() => { setCurrentNote(note); setView('edit'); }}
                                    className={`bg-stone-900 border border-stone-800 hover:border-stone-700 cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300 group ${viewType === 'card' ? 'p-6 rounded-3xl h-[340px]' : 'p-4 rounded-xl flex justify-between items-center'}`}
                                >
                                    {viewType === 'card' ? (
                                        <div className="flex flex-col h-full">
                                            {/* Header */}
                                            <div className="mb-4">
                                                <h3 className="font-bold text-xl text-stone-100 group-hover:text-amber-500 transition-colors leading-snug mb-1">{note.title || "Untitled Note"}</h3>
                                                <span className="text-xs text-stone-500 font-medium">{new Date(note.updated_at).toLocaleDateString()}</span>
                                            </div>

                                            {/* Content Preview */}
                                            <div className="flex-1 bg-stone-950/50 rounded-2xl p-4 border border-stone-800/50 mb-4 overflow-hidden relative">
                                                <div className="text-stone-400 text-sm prose prose-sm prose-invert max-w-none prose-p:text-stone-400 prose-headings:text-stone-300 line-clamp-4">
                                                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                        {note.content}
                                                    </ReactMarkdown>
                                                </div>
                                                {/* Fade out effect */}
                                                <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-stone-950/50 to-transparent pointer-events-none" />
                                            </div>

                                            {/* Footer */}
                                            <div className="flex gap-2 flex-wrap mt-auto">
                                                {note.tags?.slice(0, 3).map((t: string) => (
                                                    <span key={t} className="px-2.5 py-1 rounded-full text-xs font-medium bg-stone-800 text-stone-400 border border-stone-700">
                                                        #{t}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-stone-800 text-stone-400 rounded-lg"><FileText size={18} /></div>
                                                <div>
                                                    <h3 className="font-medium text-stone-200">{note.title}</h3>
                                                    <p className="text-xs text-stone-600">{new Date(note.updated_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex gap-1">
                                                    {note.tags?.slice(0, 3).map((t: string) => <span key={t} className="text-xs bg-stone-800 px-1.5 py-0.5 rounded text-stone-400 border border-stone-700">#{t}</span>)}
                                                </div>
                                                <ChevronRight size={16} className="text-stone-700" />
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {view === 'edit' && currentNote && (
                <div className="max-w-4xl mx-auto bg-stone-900 min-h-[80vh] rounded-xl shadow-lg border border-stone-800 flex flex-col">
                    <div className="p-4 border-b border-stone-800 flex justify-between items-center">
                        <button onClick={() => setView('list')} className="text-stone-500 hover:text-stone-200 transition-colors">← Back</button>
                        <button onClick={handleSave} className="bg-stone-100 text-stone-900 px-4 py-2 rounded hover:bg-white font-medium transition-colors">Save</button>
                    </div>
                    <div className="p-8 flex-1 flex flex-col h-full">
                        <input
                            value={currentNote.title}
                            onChange={e => setCurrentNote({ ...currentNote, title: e.target.value })}
                            className="text-3xl font-bold mb-6 bg-transparent text-stone-100 focus:outline-none w-full placeholder-stone-700"
                            placeholder="Title"
                        />
                        <div className="flex gap-2 mb-6">
                            {currentNote.tags?.map((t: string) => (
                                <span key={t} className="bg-stone-800 px-2 py-1 rounded text-sm text-stone-400 border border-stone-700">#{t}</span>
                            ))}
                            {/* Tag editing could be added here */}
                        </div>
                        <div className="flex-1 min-h-0 flex flex-col">
                            <RichTextEditor
                                value={currentNote.content || ''}
                                onChange={val => setCurrentNote((prev: any) => ({ ...prev, content: val }))}
                                minHeight="400px"
                            />
                        </div>
                        <Backlinks currentId={currentNote.id} currentTitle={currentNote.title} />
                    </div>
                </div>
            )}
        </div>
    );
}

function SparklesIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
}
