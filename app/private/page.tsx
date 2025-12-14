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
            <div className="flex h-96 items-center justify-center text-slate-400">
                <Loader2 className="animate-spin" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-10">
            {/* Header */}
            <div className="flex flex-col gap-2 border-b border-slate-200 pb-8">
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 font-sans">
                    Welcome Back
                </h1>
                <p className="text-lg text-slate-500 font-light">
                    Here's what's happening in your workspace today.
                </p>
            </div>

            {/* Quick Add Hero */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-8 rounded-2xl shadow-xl text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-20 -mr-16 -mt-16 pointer-events-none"></div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 relative z-10">
                    <Sparkles className="text-indigo-300" size={20} />
                    Quick Capture
                </h2>
                <form onSubmit={handleQuickAdd} className="flex gap-3 relative z-10">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="What needs to be done? (e.g. 'Review grant proposal by Friday')"
                        className="flex-1 p-4 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white/20 placeholder:text-slate-300 transition-all text-white backdrop-blur-sm"
                        disabled={processing}
                    />
                    <button
                        type="submit"
                        disabled={processing}
                        className="bg-white text-slate-900 px-8 py-4 rounded-xl font-bold hover:bg-indigo-50 disabled:opacity-50 transition-all shadow-lg active:scale-95"
                    >
                        {processing ? <Loader2 className="animate-spin" /> : 'Add Task'}
                    </button>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Tasks Widget */}
                <div className="flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div className="flex items-center gap-2 font-bold text-slate-800">
                            <CheckCircle2 className="text-emerald-500" size={18} />
                            Top Tasks
                        </div>
                        <Link href="/private/tasks" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group">
                            View All <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </div>
                    <div className="p-4 space-y-3 flex-1">
                        {tasks.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm py-8">
                                <CheckCircle2 size={32} className="mb-2 opacity-20" />
                                All caught up!
                            </div>
                        ) : tasks.map(task => (
                            <div key={task.id} className="p-3 bg-white rounded-xl border border-slate-100 hover:border-indigo-100 hover:shadow-sm transition-all flex justify-between items-start group">
                                <div className="min-w-0">
                                    <p className="font-medium text-slate-700 text-sm truncate group-hover:text-indigo-900 transition-colors">{task.title}</p>
                                    <div className="flex gap-2 mt-1.5">
                                        {task.priority && (
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${task.priority === 'High' ? 'bg-rose-50 text-rose-600' :
                                                    task.priority === 'Medium' ? 'bg-amber-50 text-amber-600' :
                                                        'bg-emerald-50 text-emerald-600'
                                                }`}>{task.priority}</span>
                                        )}
                                        {task.due_date && (
                                            <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
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
                <div className="flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div className="flex items-center gap-2 font-bold text-slate-800">
                            <BookOpen className="text-blue-500" size={18} />
                            Reading List
                        </div>
                        <Link href="/private/papers" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group">
                            View All <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </div>
                    <div className="p-4 space-y-3 flex-1">
                        {readingPapers.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm py-8">
                                <BookOpen size={32} className="mb-2 opacity-20" />
                                No active papers.
                            </div>
                        ) : readingPapers.map(paper => (
                            <div key={paper.id} className="p-3 bg-white rounded-xl border border-slate-100 hover:border-blue-100 hover:shadow-sm transition-all group">
                                <p className="font-medium text-slate-700 text-sm line-clamp-2 group-hover:text-blue-900 transition-colors">{paper.title}</p>
                                <p className="text-xs text-slate-400 mt-1.5 truncate">{paper.authors}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Notes Widget */}
                <div className="flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div className="flex items-center gap-2 font-bold text-slate-800">
                            <FileText className="text-purple-500" size={18} />
                            Recent Notes
                        </div>
                        <Link href="/private/notes" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group">
                            View All <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </div>
                    <div className="p-4 space-y-3 flex-1">
                        {recentNotes.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm py-8">
                                <FileText size={32} className="mb-2 opacity-20" />
                                Start writing...
                            </div>
                        ) : recentNotes.map(note => (
                            <Link key={note.id} href={`/private/notes?id=${note.id}`} className="block p-3 bg-white rounded-xl border border-slate-100 hover:border-purple-100 hover:shadow-sm transition-all group">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 group-hover:scale-125 transition-transform"></div>
                                    <p className="font-medium text-slate-700 text-sm truncate group-hover:text-purple-900 transition-colors">{note.title}</p>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1.5 pl-3.5">
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
