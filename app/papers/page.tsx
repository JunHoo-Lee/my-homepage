'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { BookOpen, Check, Clock, Plus, Trash2 } from 'lucide-react';

interface Paper {
    id: string;
    title: string;
    authors: string;
    link: string;
    status: 'unread' | 'reading' | 'read';
    memo: string | null;
    tags: string[];
}

export default function PapersPage() {
    const [papers, setPapers] = useState<Paper[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newPaper, setNewPaper] = useState({ title: '', authors: '', link: '', status: 'unread' });

    useEffect(() => {
        fetchPapers();
    }, []);

    const fetchPapers = async () => {
        const { data } = await supabase
            .from('papers')
            .select('*')
            .order('created_at', { ascending: false });
        if (data) setPapers(data);
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const { data } = await supabase.from('papers').insert([newPaper as any]).select().single();
        if (data) {
            setPapers([data, ...papers]);
            setIsAdding(false);
            setNewPaper({ title: '', authors: '', link: '', status: 'unread' });
        }
    };

    const updateStatus = async (id: string, status: string) => {
        await supabase.from('papers').update({ status }).eq('id', id);
        setPapers(papers.map(p => p.id === id ? { ...p, status: status as any } : p));
    };

    const deletePaper = async (id: string) => {
        if (window.confirm('Delete this paper?')) {
            await supabase.from('papers').delete().eq('id', id);
            setPapers(papers.filter(p => p.id !== id));
        }
    }

    const getStatusIcon = (status: string) => {
        if (status === 'read') return <Check size={16} className="text-green-500" />;
        if (status === 'reading') return <BookOpen size={16} className="text-blue-500" />;
        return <Clock size={16} className="text-gray-400" />;
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Papers</h1>
                    <p className="text-gray-500">Track your reading list.</p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                    <Plus size={18} /> Add Paper
                </button>
            </header>

            {isAdding && (
                <form onSubmit={handleAdd} className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-4">
                    <input
                        placeholder="Title"
                        className="w-full p-2 border rounded"
                        value={newPaper.title}
                        onChange={e => setNewPaper({ ...newPaper, title: e.target.value })}
                        required
                    />
                    <input
                        placeholder="Authors"
                        className="w-full p-2 border rounded"
                        value={newPaper.authors}
                        onChange={e => setNewPaper({ ...newPaper, authors: e.target.value })}
                    />
                    <div className="flex gap-4">
                        <input
                            placeholder="Link (PDF/ArXiv)"
                            className="flex-1 p-2 border rounded"
                            value={newPaper.link}
                            onChange={e => setNewPaper({ ...newPaper, link: e.target.value })}
                        />
                        <select
                            className="p-2 border rounded"
                            value={newPaper.status}
                            onChange={e => setNewPaper({ ...newPaper, status: e.target.value })}
                        >
                            <option value="unread">Unread</option>
                            <option value="reading">Reading</option>
                            <option value="read">Read</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-gray-600">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                    </div>
                </form>
            )}

            <div className="grid gap-4">
                {papers.map(paper => (
                    <div key={paper.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex justify-between items-start group">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                {getStatusIcon(paper.status)}
                                <h3 className="font-semibold text-lg">
                                    {paper.link ? <a href={paper.link} target="_blank" className="hover:text-blue-600 hover:underline">{paper.title}</a> : paper.title}
                                </h3>
                            </div>
                            <p className="text-gray-600 text-sm mb-2">{paper.authors}</p>
                            <div className="flex gap-2">
                                {paper.status !== 'read' && (
                                    <button onClick={() => updateStatus(paper.id, 'read')} className="text-xs border px-2 py-1 rounded hover:bg-gray-50">Mark Read</button>
                                )}
                                {paper.status !== 'reading' && (
                                    <button onClick={() => updateStatus(paper.id, 'reading')} className="text-xs border px-2 py-1 rounded hover:bg-gray-50">Reading</button>
                                )}
                            </div>
                        </div>
                        <button onClick={() => deletePaper(paper.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
