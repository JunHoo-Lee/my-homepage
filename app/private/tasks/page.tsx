'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { Loader2, Plus, GripVertical } from 'lucide-react';

export default function TasksPage() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [input, setInput] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        setLoading(true);
        const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
        // Client-side sorting by priority + completion could be better
        // Sort: Incomplete first -> Priority (High>Med>Low) -> Due date
        // For now simple sort
        const sorted = data?.sort((a, b) => {
            if (a.completed === b.completed) return 0;
            return a.completed ? 1 : -1;
        });
        setTasks(sorted || []);
        setLoading(false);
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        setProcessing(true);
        try {
            const res = await fetch('/api/ai/parse-task', {
                method: 'POST',
                body: JSON.stringify({ input })
            });
            const { task } = await res.json();
            if (task) {
                await supabase.from('tasks').insert([task]);
                fetchTasks();
                setInput('');
            }
        } catch (e) { console.error(e); }
        finally { setProcessing(false); }
    };

    const toggleComplete = async (id: string, current: boolean) => {
        await supabase.from('tasks').update({ completed: !current }).eq('id', id);
        setTasks(tasks.map(t => t.id === id ? { ...t, completed: !current } : t));
    };

    const deleteCompleted = async () => {
        await supabase.from('tasks').delete().eq('completed', true);
        fetchTasks();
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>

            {/* AI Input */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <form onSubmit={handleAdd} className="flex gap-4">
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="New task... (e.g. 'Submit rebuttal by Friday priority high')"
                        className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={processing}
                    />
                    <button
                        type="submit"
                        disabled={processing}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {processing ? <Loader2 className="animate-spin" /> : <Plus />} Add
                    </button>
                </form>
            </div>

            <div className="space-y-3">
                {loading ? <p>Loading...</p> : tasks.map(task => (
                    <div key={task.id} className={`group flex items-start gap-4 p-4 bg-white rounded-lg border transition-all ${task.completed ? 'opacity-50 border-gray-100' : 'border-gray-200 shadow-sm'}`}>
                        <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => toggleComplete(task.id, task.completed)}
                            className="mt-1.5 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <h3 className={`font-medium text-lg ${task.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>{task.title}</h3>
                                <div className="flex gap-2">
                                    {task.priority && <span className={`text-xs px-2 py-1 rounded font-medium ${task.priority === 'High' ? 'bg-red-50 text-red-700' :
                                            task.priority === 'Medium' ? 'bg-yellow-50 text-yellow-700' :
                                                'bg-green-50 text-green-700'
                                        }`}>{task.priority}</span>}
                                </div>
                            </div>
                            {task.memo && <p className="text-gray-500 text-sm mt-1">{task.memo}</p>}
                            <div className="flex gap-2 mt-2">
                                {task.due_date && <span className="text-xs text-gray-400">Due: {new Date(task.due_date).toLocaleDateString()}</span>}
                                {task.tags?.map((t: string) => <span key={t} className="text-xs text-gray-400">#{t}</span>)}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {tasks.some(t => t.completed) && (
                <button onClick={deleteCompleted} className="text-sm text-red-500 hover:underline">Clear Completed</button>
            )}
        </div>
    );
}
