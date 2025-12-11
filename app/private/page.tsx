'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import Link from 'next/link';

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

        // Top 5 incomplete tasks by priority
        const { data: tasksData } = await supabase
            .from('tasks')
            .select('*')
            .eq('completed', false)
            // .order('priority', { ascending: true }) // 'High' < 'Low' alphabetically? No. High, Medium, Low.
            // We can't easily sort custom enum text in simple SQL without a helper or integer column. 
            // For MVP, just sort by created_at desc or client side sort.
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
        // Determine if it's a task or note?
        // User said "Quick Add: Input field for quick entry". 
        // Usually implies Tasks unless specified. Let's assume Task for quick add, or we could have a toggle.
        // Let's default to Task.

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

    if (loading) return <div className="p-10">Loading Dashboard...</div>;

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

            {/* Quick Add */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <form onSubmit={handleQuickAdd} className="flex gap-4">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Quick add a task (e.g. 'Read CVPR paper next Monday')"
                        className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={processing}
                    />
                    <button
                        type="submit"
                        disabled={processing}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                        {processing ? 'Adding...' : 'Add'}
                    </button>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Tasks Widget */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-gray-800">Top Tasks</h2>
                        <Link href="/private/tasks" className="text-sm text-blue-600 hover:underline">View All</Link>
                    </div>
                    <div className="space-y-3">
                        {tasks.length === 0 ? <p className="text-gray-400 text-sm">No active tasks.</p> : tasks.map(task => (
                            <div key={task.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex justify-between items-start">
                                <div>
                                    <p className="font-medium text-gray-800 line-clamp-1">{task.title}</p>
                                    <div className="flex gap-2 mt-1">
                                        {task.priority && <span className={`text-xs px-2 py-0.5 rounded-full ${task.priority === 'High' ? 'bg-red-100 text-red-700' :
                                                task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-green-100 text-green-700'
                                            }`}>{task.priority}</span>}
                                        {task.due_date && <span className="text-xs text-gray-500">Due {new Date(task.due_date).toLocaleDateString()}</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Papers Widget */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-gray-800">Reading Now</h2>
                        <Link href="/private/papers" className="text-sm text-blue-600 hover:underline">View All</Link>
                    </div>
                    <div className="space-y-3">
                        {readingPapers.length === 0 ? <p className="text-gray-400 text-sm">Not reading anything.</p> : readingPapers.map(paper => (
                            <div key={paper.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <p className="font-medium text-gray-800 line-clamp-1">{paper.title}</p>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-1">{paper.authors}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Notes Widget */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-gray-800">Recent Notes</h2>
                        <Link href="/private/notes" className="text-sm text-blue-600 hover:underline">View All</Link>
                    </div>
                    <div className="space-y-3">
                        {recentNotes.length === 0 ? <p className="text-gray-400 text-sm">No notes yet.</p> : recentNotes.map(note => (
                            <Link key={note.id} href={`/private/notes?id=${note.id}`} className="block p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                                <p className="font-medium text-gray-800 line-clamp-1">{note.title}</p>
                                <p className="text-xs text-gray-500 mt-1">Updated {new Date(note.updated_at).toLocaleDateString()}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
