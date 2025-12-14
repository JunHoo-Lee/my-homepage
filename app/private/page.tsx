'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import Link from 'next/link';
import { Loader2, ArrowRight, CheckCircle2, FileText, BookOpen, Sparkles } from 'lucide-react';

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [tasks, setTasks] = useState<any[]>([]);
    const [recentNotes, setRecentNotes] = useState<any[]>([]);
    const [readingPapers, setReadingPapers] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);

        // Top 5 incomplete tasks (latest first)
        const { data: tasksData } = await supabase
            .from('tasks')
            .select('*')
            .eq('completed', false)
            .order('created_at', { ascending: false })
            .limit(5);

        // Recent Notes
        const { data: notesData } = await supabase
            .from('notes')
            .select('id, title, updated_at')
            .order('updated_at', { ascending: false })
            .limit(5);

        // Reading Papers
        const { data: papersData } = await supabase
            .from('papers')
            .select('id, title, authors')
            .eq('status', 'reading')
            .limit(5);

        setTasks(tasksData || []);
        setRecentNotes(notesData || []);
        setReadingPapers(papersData || []);
        setLoading(false);
    };

    const handleQuickAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        setProcessing(true);
        try {
            const res = await fetch('/api/ai/parse-task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ input })
            });
            const { task } = await res.json();

            if (task) {
                await supabase.from('tasks').insert([task]);
                fetchDashboardData();
                setInput('');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center text-stone-500">
                <Loader2 className="animate-spin" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-10">
            {/* Header */}
            <div className="flex flex-col gap-2 border-b border-stone-800 pb-8">
                <h1 className="text-4xl font-extrabold tracking-tight text-stone-100 font-sans">
                    Welcome Back
                </h1>
                <p className="text-lg text-stone-400 font-light">
                    Here's what's happening in your workspace today.
                </p>
            </div>

            {/* Quick Add Hero */}
            <div className="bg-gradient-to-br from-stone-800 to-stone-900 p-8 rounded-2xl shadow-xl border border-stone-700/50 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500 rounded-full blur-3xl opacity-10 -mr-16 -mt-16 pointer-events-none"></div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 relative z-10 text-stone-200">
                    <Sparkles className="text-amber-400" size={20} />
                    Quick Capture
                </h2>
                <form onSubmit={handleQuickAdd} className="flex gap-3 relative z-10">
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
                        className="bg-amber-600 text-stone-950 px-8 py-4 rounded-xl font-bold hover:bg-amber-500 disabled:opacity-50 transition-all shadow-lg shadow-amber-900/20 active:scale-95"
                    >
                        {processing ? <Loader2 className="animate-spin" /> : 'Add Task'}
                    </button>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Tasks Widget */}
                <div className="flex flex-col bg-stone-900 rounded-2xl shadow-sm border border-stone-800 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-5 border-b border-stone-800 flex justify-between items-center bg-stone-900/50">
                        <div className="flex items-center gap-2 font-bold text-stone-200">
                            <CheckCircle2 className="text-emerald-500" size={18} />
                            Top Tasks
                        </div>
                        <Link href="/private/tasks" className="text-xs font-semibold text-amber-500 hover:text-amber-400 flex items-center gap-1 group">
                            View All <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </div>
                    <div className="p-4 space-y-3 flex-1">
                        {tasks.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-stone-500 text-sm py-8">
                                <CheckCircle2 size={32} className="mb-2 opacity-20" />
                                All caught up!
                            </div>
                        ) : tasks.map(task => (
                            <div key={task.id} className="p-3 bg-stone-950/50 rounded-xl border border-stone-800 hover:border-amber-900/50 hover:bg-stone-800/50 transition-all flex justify-between items-start group">
                                <div className="min-w-0">
                                    <p className="font-medium text-stone-300 text-sm truncate group-hover:text-amber-100 transition-colors">{task.title}</p>
                                    <div className="flex gap-2 mt-1.5">
                                        {task.priority && (
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${task.priority === 'High' ? 'bg-rose-950/30 text-rose-400 border border-rose-900/30' :
                                                    task.priority === 'Medium' ? 'bg-amber-950/30 text-amber-400 border border-amber-900/30' :
                                                        'bg-emerald-950/30 text-emerald-400 border border-emerald-900/30'
                                                }`}>{task.priority}</span>
                                        )}
                                        {task.due_date && (
                                            <span className="text-[10px] text-stone-500 bg-stone-900 px-2 py-0.5 rounded-full border border-stone-800">
                                                {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Papers Widget */}
                <div className="flex flex-col bg-stone-900 rounded-2xl shadow-sm border border-stone-800 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-5 border-b border-stone-800 flex justify-between items-center bg-stone-900/50">
                        <div className="flex items-center gap-2 font-bold text-stone-200">
                            <BookOpen className="text-blue-400" size={18} />
                            Reading List
                        </div>
                        <Link href="/private/papers" className="text-xs font-semibold text-amber-500 hover:text-amber-400 flex items-center gap-1 group">
                            View All <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </div>
                    <div className="p-4 space-y-3 flex-1">
                        {readingPapers.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-stone-500 text-sm py-8">
                                <BookOpen size={32} className="mb-2 opacity-20" />
                                No active papers.
                            </div>
                        ) : readingPapers.map(paper => (
                            <div key={paper.id} className="p-3 bg-stone-950/50 rounded-xl border border-stone-800 hover:border-blue-900/30 hover:bg-stone-800/50 transition-all group">
                                <p className="font-medium text-stone-300 text-sm line-clamp-2 group-hover:text-blue-300 transition-colors">{paper.title}</p>
                                <p className="text-xs text-stone-500 mt-1.5 truncate">{paper.authors}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Notes Widget */}
                <div className="flex flex-col bg-stone-900 rounded-2xl shadow-sm border border-stone-800 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-5 border-b border-stone-800 flex justify-between items-center bg-stone-900/50">
                        <div className="flex items-center gap-2 font-bold text-stone-200">
                            <FileText className="text-purple-400" size={18} />
                            Recent Notes
                        </div>
                        <Link href="/private/notes" className="text-xs font-semibold text-amber-500 hover:text-amber-400 flex items-center gap-1 group">
                            View All <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </div>
                    <div className="p-4 space-y-3 flex-1">
                        {recentNotes.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-stone-500 text-sm py-8">
                                <FileText size={32} className="mb-2 opacity-20" />
                                Start writing...
                            </div>
                        ) : recentNotes.map(note => (
                            <Link key={note.id} href={`/private/notes?id=${note.id}`} className="block p-3 bg-stone-950/50 rounded-xl border border-stone-800 hover:border-purple-900/30 hover:bg-stone-800/50 transition-all group">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 group-hover:scale-125 transition-transform"></div>
                                    <p className="font-medium text-stone-300 text-sm truncate group-hover:text-purple-300 transition-colors">{note.title}</p>
                                </div>
                                <p className="text-[10px] text-stone-500 mt-1.5 pl-3.5">
                                    Edited {new Date(note.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </p>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
