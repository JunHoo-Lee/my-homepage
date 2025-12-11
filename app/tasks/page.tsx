'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { Loader2, Calendar, Tag, Trash2, CheckCircle } from 'lucide-react';

interface Task {
    id: string;
    title: string;
    memo: string | null;
    priority: 'High' | 'Medium' | 'Low';
    due_date: string | null;
    tags: string[];
    completed: boolean;
    is_new: boolean;
}

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [input, setInput] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const [availableTags, setAvailableTags] = useState<string[]>([]);

    useEffect(() => {
        fetchTasks();
        fetchTags();
    }, []);

    const fetchTasks = async () => {
        const { data } = await supabase
            .from('tasks')
            .select('*')
            .eq('completed', false)
            .order('created_at', { ascending: false });

        if (data) setTasks(data);
        setIsLoading(false);
    };

    const fetchTags = async () => {
        const { data } = await supabase.from('tags').select('name');
        if (data) setAvailableTags(data.map(t => t.name));
    };


    const handleQuickAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        setIsParsing(true);
        try {
            // 1. Parse with AI
            const aiRes = await fetch('/api/ai/parse-task', {
                method: 'POST',
                body: JSON.stringify({ input }),
            });
            const { task: parsedTask } = await aiRes.json();

            // 2. Save to Supabase
            const { data, error } = await supabase
                .from('tasks')
                .insert([parsedTask])
                .select()
                .single();

            if (data) {
                setTasks([data, ...tasks]);
                setInput('');

                // 3. Update Tags Pool (Fire and forget)
                if (parsedTask.tags && parsedTask.tags.length > 0) {
                    parsedTask.tags.forEach(async (tag: string) => {
                        await supabase.from('tags').insert({ name: tag }).single(); // loose insert, ignore error
                    });
                }
            }
        } catch (err) {
            console.error('Failed to add task', err);
            alert('Failed to process task. Check console.');
        } finally {
            setIsParsing(false);
        }
    };

    const handleComplete = async (id: string) => {
        await supabase.from('tasks').update({ completed: true }).eq('id', id);
        setTasks(tasks.filter(t => t.id !== id));
    };

    const handleDelete = async (id: string) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this task?");
        if (confirmDelete) {
            await supabase.from('tasks').delete().eq('id', id);
            setTasks(tasks.filter(t => t.id !== id));
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <header>
                <h1 className="text-3xl font-bold mb-2">Tasks</h1>
                <p className="text-gray-500">Manage your research and life with AI.</p>
                {availableTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                        {availableTags.map(tag => (
                            <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">#{tag}</span>
                        ))}
                    </div>
                )}
            </header>

            {/* Quick Add Area */}
            <form onSubmit={handleQuickAdd} className="relative">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="e.g. 'Read Diffusion Paper by Friday priority high'"
                    className="w-full p-4 pr-12 rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none h-24 transition-all"
                    disabled={isParsing}
                />
                <button
                    type="submit"
                    disabled={isParsing || !input.trim()}
                    className="absolute bottom-4 right-4 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                    {isParsing ? <Loader2 className="animate-spin" size={20} /> : 'Add'}
                </button>
            </form>

            {/* Task List */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-400" /></div>
                ) : tasks.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">No active tasks. Good job!</div>
                ) : (
                    tasks.map(task => (
                        <div key={task.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group relative">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-semibold text-lg">{task.title}</h3>
                                <span className={`text-xs px-2 py-1 rounded-full font-medium 
                        ${task.priority === 'High' ? 'bg-red-100 text-red-700' :
                                        task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-green-100 text-green-700'}`}>
                                    {task.priority}
                                </span>
                            </div>

                            {task.memo && <p className="text-gray-600 text-sm mb-3">{task.memo}</p>}

                            <div className="flex items-center gap-4 text-xs text-gray-400">
                                {task.due_date && (
                                    <div className="flex items-center gap-1">
                                        <Calendar size={14} />
                                        {new Date(task.due_date).toLocaleDateString()}
                                    </div>
                                )}
                                {task.tags && task.tags.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <Tag size={14} />
                                        <div className="flex gap-1">
                                            {task.tags.map(tag => (
                                                <span key={tag} className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">#{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="absolute top-4 right-[-30px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
                                <button onClick={() => handleComplete(task.id)} className="p-2 text-green-500 hover:bg-green-50 rounded-full" title="Complete">
                                    <CheckCircle size={20} />
                                </button>
                                <button onClick={() => handleDelete(task.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-full" title="Delete">
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
