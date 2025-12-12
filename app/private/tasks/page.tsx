'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { Loader2, Plus, GripVertical } from 'lucide-react';

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
            // Fallback for failed AI parse?
            // For now just alert, user asked about *editing* priority, not adding failure.
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

    return (
        <div className="space-y-6 relative">
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
                    <div
                        key={task.id}
                        onClick={() => setEditingTask(task)}
                        className={`group flex items-start gap-4 p-4 bg-white rounded-lg border transition-all cursor-pointer hover:shadow-md ${task.completed ? 'opacity-50 border-gray-100' : 'border-gray-200 shadow-sm'}`}
                    >
                        <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={(e) => { e.stopPropagation(); toggleComplete(task.id, task.completed); }}
                            className="mt-1.5 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
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

            {/* Edit Task Modal */}
            {editingTask && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Edit Task</h2>
                            <button onClick={() => setEditingTask(null)} className="text-gray-400 hover:text-gray-600"><Plus className="rotate-45" size={24} /></button>
                        </div>

                        <form onSubmit={handleUpdateTask} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Task</label>
                                <input
                                    className="w-full p-2 border rounded"
                                    value={editingTask.title}
                                    onChange={e => setEditingTask({ ...editingTask, title: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                                    <select
                                        className="w-full p-2 border rounded bg-white"
                                        value={editingTask.priority || 'Low'}
                                        onChange={e => setEditingTask({ ...editingTask, priority: e.target.value })}
                                    >
                                        <option value="High">High</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Low">Low</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                                    <input
                                        type="date"
                                        className="w-full p-2 border rounded"
                                        value={editingTask.due_date || ''}
                                        onChange={e => setEditingTask({ ...editingTask, due_date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                    className="w-full p-3 border rounded-lg h-24 resize-none"
                                    placeholder="Add notes..."
                                    value={editingTask.memo || ''}
                                    onChange={e => setEditingTask({ ...editingTask, memo: e.target.value })}
                                ></textarea>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => deleteTask(editingTask.id)}
                                    className="text-red-500 hover:bg-red-50 px-3 py-2 rounded text-sm"
                                >
                                    Delete
                                </button>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setEditingTask(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
