'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { Loader2, Plus, GripVertical, Check, Trash2, Calendar, Tag, AlertCircle } from 'lucide-react';

export default function TasksPage() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [input, setInput] = useState('');
    const [processing, setProcessing] = useState(false);

    // Edit State
    const [editingTask, setEditingTask] = useState<any | null>(null);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        setLoading(true);
        const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
        // Client-side sorting by priority + completion
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
        } catch (e) {
            console.error(e);
            alert('Failed to add task. Try again.');
        }
        finally { setProcessing(false); }
    };

    const toggleComplete = async (id: string, current: boolean) => {
        await supabase.from('tasks').update({ completed: !current }).eq('id', id);
        setTasks(tasks.map(t => t.id === id ? { ...t, completed: !current } : t));
    };

    const deleteCompleted = async () => {
        if (confirm('Delete all completed tasks?')) {
            await supabase.from('tasks').delete().eq('completed', true);
            fetchTasks();
        }
    }

    const handleUpdateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTask) return;

        const { error } = await supabase.from('tasks').update({
            title: editingTask.title,
            priority: editingTask.priority,
            memo: editingTask.memo,
            due_date: editingTask.due_date
        }).eq('id', editingTask.id);

        if (!error) {
            setEditingTask(null);
            fetchTasks();
        } else {
            alert('Failed to update task');
        }
    };

    const deleteTask = async (id: string) => {
        if (confirm('Delete this task?')) {
            await supabase.from('tasks').delete().eq('id', id);
            setTasks(tasks.filter(t => t.id !== id));
            setEditingTask(null);
        }
    };

    const getPriorityColor = (p: string) => {
        switch (p) {
            case 'High': return 'bg-rose-100 text-rose-700 border-rose-200';
            case 'Medium': return 'bg-amber-100 text-amber-700 border-amber-200';
            default: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-10">
            {/* Header */}
            <div className="flex flex-col gap-2 border-b border-slate-200 pb-8">
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 font-sans">
                    Tasks
                </h1>
                <p className="text-lg text-slate-500 font-light">
                    Manage your priorities and deadlines effectively.
                </p>
            </div>

            {/* Input Hero */}
            <div className="bg-white p-2 rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100">
                <form onSubmit={handleAdd} className="flex gap-2">
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Add a new task... (e.g. 'Review paper by Friday priority high')"
                        className="flex-1 p-4 bg-transparent text-lg placeholder:text-slate-400 focus:outline-none"
                        disabled={processing}
                    />
                    <button
                        type="submit"
                        disabled={processing}
                        className="bg-slate-900 text-white px-8 rounded-xl font-medium hover:bg-slate-800 disabled:opacity-50 transition-all shadow-md active:scale-95 flex items-center gap-2"
                    >
                        {processing ? <Loader2 className="animate-spin" /> : <Plus />}
                        Create Task
                    </button>
                </form>
            </div>

            {/* Task List */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-xl font-bold text-slate-900">Task List</h2>
                    {tasks.some(t => t.completed) && (
                        <button onClick={deleteCompleted} className="text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
                            Clear Completed
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="py-20 flex justify-center text-slate-400">
                        <Loader2 className="animate-spin" />
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {tasks.map(task => (
                            <div
                                key={task.id}
                                onClick={() => setEditingTask(task)}
                                className={`
                                    group flex items-start gap-4 p-5 bg-white rounded-xl border transition-all cursor-pointer 
                                    ${task.completed
                                        ? 'bg-slate-50 border-slate-100 opacity-60'
                                        : 'border-slate-200 hover:border-indigo-300 hover:shadow-md'
                                    }
                                `}
                            >
                                <div
                                    className={`
                                        mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                                        ${task.completed ? 'bg-slate-400 border-slate-400' : 'border-slate-300 group-hover:border-indigo-500'}
                                    `}
                                    onClick={(e) => { e.stopPropagation(); toggleComplete(task.id, task.completed); }}
                                >
                                    {task.completed && <Check size={14} className="text-white" />}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                        <h3 className={`font-medium text-lg leading-snug ${task.completed ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                                            {task.title}
                                        </h3>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {task.priority && (
                                                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${getPriorityColor(task.priority)}`}>
                                                    {task.priority}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {(task.memo || task.due_date || (task.tags && task.tags.length > 0)) && (
                                        <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
                                            {task.due_date && (
                                                <div className="flex items-center gap-1.5 text-slate-500">
                                                    <Calendar size={14} />
                                                    <span>{new Date(task.due_date).toLocaleDateString()}</span>
                                                </div>
                                            )}
                                            {task.tags?.map((t: string) => (
                                                <div key={t} className="flex items-center gap-1 text-slate-500">
                                                    <Tag size={14} />
                                                    <span>{t}</span>
                                                </div>
                                            ))}
                                            {task.memo && (
                                                <p className="w-full text-slate-500 mt-1 line-clamp-1">{task.memo}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {tasks.length === 0 && (
                            <div className="text-center py-20 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                                No tasks yet. Add one above!
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingTask && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-900">Edit Task</h2>
                            <button onClick={() => setEditingTask(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <Plus className="rotate-45 text-slate-500" size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateTask} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Task Title</label>
                                <input
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                                    value={editingTask.title}
                                    onChange={e => setEditingTask({ ...editingTask, title: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Priority</label>
                                    <div className="relative">
                                        <select
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none font-medium"
                                            value={editingTask.priority || 'Low'}
                                            onChange={e => setEditingTask({ ...editingTask, priority: e.target.value })}
                                        >
                                            <option value="High">High Priority</option>
                                            <option value="Medium">Medium Priority</option>
                                            <option value="Low">Low Priority</option>
                                        </select>
                                        <AlertCircle className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" size={16} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Due Date</label>
                                    <input
                                        type="date"
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-600"
                                        value={editingTask.due_date || ''}
                                        onChange={e => setEditingTask({ ...editingTask, due_date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Notes</label>
                                <textarea
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl h-32 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-600 leading-relaxed"
                                    placeholder="Add detailed notes..."
                                    value={editingTask.memo || ''}
                                    onChange={e => setEditingTask({ ...editingTask, memo: e.target.value })}
                                ></textarea>
                            </div>

                            <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => deleteTask(editingTask.id)}
                                    className="text-red-500 hover:bg-red-50 hover:text-red-600 px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                    <Trash2 size={16} /> Delete Task
                                </button>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setEditingTask(null)}
                                        className="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 shadow-lg shadow-slate-900/10 transition-all hover:-translate-y-0.5"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
