'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { Search, Plus, Sparkles, Book, CheckSquare, FileText, ArrowRight, Clock } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
    // State
    const [tasks, setTasks] = useState<any[]>([]);
    const [papers, setPapers] = useState<any[]>([]);
    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Quick Capture
    const [input, setInput] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const [tasksRes, papersRes, notesRes] = await Promise.all([
                supabase.from('tasks').select('*').order('created_at', { ascending: false }).limit(5),
                supabase.from('papers').select('*').order('created_at', { ascending: false }).limit(5),
                supabase.from('notes').select('*').order('updated_at', { ascending: false }).limit(5)
            ]);

            setTasks(tasksRes.data || []);
            setPapers(papersRes.data || []);
            setNotes(notesRes.data || []);
            setLoading(false);
        };
        fetchData();
    }, []);

    const handleQuickCapture = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        try {
            const res = await fetch('/api/ai/quick-capture', {
                method: 'POST',
                body: JSON.stringify({ input })
            });
            const data = await res.json();
            if (data.type === 'task') setTasks([data.data, ...tasks]);
            if (data.type === 'note') setNotes([data.data, ...notes]);
            if (data.type === 'paper') setPapers([data.data, ...papers]);
            setInput('');
            alert(`Added to ${data.type}s!`);
        } catch (e) {
            console.error(e);
            alert('Failed to capture');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-12">
            {/* Header */}
            <div className="flex flex-col gap-2 border-b border-stone-800 pb-8">
                <h1 className="text-4xl font-extrabold tracking-tight text-stone-100 font-sans">
                    Welcome Back
                </h1>
                <p className="text-lg text-stone-400 font-light">
                    Here's what's happening in your workspace today.
                </p>
            </div>

            {/* Quick Capture Hero */}
            <div className="bg-gradient-to-br from-stone-800 to-stone-900 p-8 rounded-2xl shadow-xl border border-stone-700/50 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-amber-500/20"></div>

                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 relative z-10 text-stone-200">
                    <Sparkles className="text-amber-400" size={20} />
                    Quick Capture
                </h2>
                <form onSubmit={handleQuickCapture} className="flex gap-4 relative z-10">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="What needs to be done? (e.g. 'Review grant proposal by Friday')"
                        className="flex-1 p-4 bg-stone-950/30 border border-stone-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:bg-stone-950/50 placeholder:text-stone-500 transition-all text-stone-200 backdrop-blur-sm"
                        disabled={processing}
                    />
                    <button
                        type="submit"
                        disabled={processing}
                        className="bg-stone-100/90 text-stone-900 hover:bg-white px-8 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 active:scale-95"
                    >
                        {processing ? 'Processing...' : 'Capture'}
                    </button>
                </form>
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Tasks Column */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-stone-200 flex items-center gap-2">
                            <CheckSquare className="text-emerald-500" size={20} /> Top Tasks
                        </h2>
                        <Link href="/private/tasks" className="text-sm text-stone-500 hover:text-stone-300 flex items-center gap-1">
                            View All <ArrowRight size={14} />
                        </Link>
                    </div>
                    <div className="bg-stone-900 rounded-xl border border-stone-800 shadow-sm overflow-hidden">
                        {tasks.length === 0 ? (
                            <div className="p-8 text-center text-stone-500 text-sm">No pending tasks</div>
                        ) : (
                            <div className="divide-y divide-stone-800">
                                {tasks.map(t => (
                                    <div key={t.id} className="p-4 hover:bg-stone-800/50 transition-colors group cursor-default">
                                        <div className="flex items-start gap-3">
                                            <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${t.priority === 'High' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-medium text-stone-300 truncate ${t.completed ? 'line-through text-stone-600' : ''}`}>{t.title}</p>
                                                {t.due_date && <p className="text-xs text-stone-500 mt-1 flex items-center gap-1"><Clock size={10} />Due {new Date(t.due_date).toLocaleDateString()}</p>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Papers Column */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-stone-200 flex items-center gap-2">
                            <Book className="text-blue-500" size={20} /> Reading List
                        </h2>
                        <Link href="/private/papers" className="text-sm text-stone-500 hover:text-stone-300 flex items-center gap-1">
                            Library <ArrowRight size={14} />
                        </Link>
                    </div>
                    <div className="bg-stone-900 rounded-xl border border-stone-800 shadow-sm overflow-hidden">
                        {papers.length === 0 ? (
                            <div className="p-8 text-center text-stone-500 text-sm">No papers saved</div>
                        ) : (
                            <div className="divide-y divide-stone-800">
                                {papers.map(p => (
                                    <a href={p.link} target="_blank" key={p.id} className="block p-4 hover:bg-stone-800/50 transition-colors group">
                                        <p className="font-medium text-stone-300 line-clamp-2 leading-snug group-hover:text-amber-500 transition-colors">{p.title}</p>
                                        <p className="text-xs text-stone-500 mt-2 line-clamp-1">{p.authors}</p>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Notes Column */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-stone-200 flex items-center gap-2">
                            <FileText className="text-purple-500" size={20} /> Recent Notes
                        </h2>
                        <Link href="/private/notes" className="text-sm text-stone-500 hover:text-stone-300 flex items-center gap-1">
                            All Notes <ArrowRight size={14} />
                        </Link>
                    </div>
                    <div className="bg-stone-900 rounded-xl border border-stone-800 shadow-sm overflow-hidden">
                        {notes.length === 0 ? (
                            <div className="p-8 text-center text-stone-500 text-sm">No notes yet</div>
                        ) : (
                            <div className="divide-y divide-stone-800">
                                {notes.map(n => (
                                    <div key={n.id} className="p-4 hover:bg-stone-800/50 transition-colors cursor-pointer">
                                        <h3 className="font-medium text-stone-300 truncate mb-1">{n.title || 'Untitled Note'}</h3>
                                        <p className="text-xs text-stone-500 line-clamp-2">{n.content?.substring(0, 100)}...</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
