'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { Plus, Loader2, Sparkles, BookOpen, ExternalLink, RefreshCw, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import RichTextEditor from '@/app/components/RichTextEditor';
import Backlinks from '@/app/components/Backlinks';

export default function PapersPage() {
    const [activeTab, setActiveTab] = useState<'my_papers' | 'trending' | 'for_you'>('my_papers');

    // Data States
    const [myPapers, setMyPapers] = useState<any[]>([]);
    const [trendingPapers, setTrendingPapers] = useState<any[]>([]);
    const [recommendedPapers, setRecommendedPapers] = useState<any[]>([]);
    const [trendingSource, setTrendingSource] = useState<'daily' | 'trending' | 'deepseek' | 'bytedance'>('daily');
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    // Loading States
    const [loadingMyParams, setLoadingMyParams] = useState(true);
    const [loadingTrending, setLoadingTrending] = useState(false); // Lazy load
    const [loadingForYou, setLoadingForYou] = useState(false); // Lazy load
    const [loadingMore, setLoadingMore] = useState(false);

    // Input State
    const [input, setInput] = useState('');
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        fetchMyPapers();
    }, []);

    // Edit/View State
    const [editingPaper, setEditingPaper] = useState<any | null>(null);
    const [manualAddModal, setManualAddModal] = useState(false);
    const [newPaper, setNewPaper] = useState({ title: '', authors: '', link: '', status: 'unread', memo: '' });

    const fetchMyPapers = async () => {
        setLoadingMyParams(true);
        const { data } = await supabase.from('papers').select('*').order('created_at', { ascending: false });
        setMyPapers(data || []);
        setLoadingMyParams(false);
    };

    const fetchTrending = async (sourceOverride?: string, isLoadMore = false) => {
        const source = sourceOverride || trendingSource;

        if (isLoadMore) {
            setLoadingMore(true);
        } else {
            setLoadingTrending(true);
            setTrendingPapers([]); // Clear previous if full refresh
            setOffset(0);
            setHasMore(true);
        }

        const currentOffset = isLoadMore ? offset : 0;

        try {
            const res = await fetch('/api/fetch-trending', {
                method: 'POST',
                body: JSON.stringify({ source, count: 10, offset: currentOffset })
            });
            const data = await res.json();
            const newPapers = data.papers || [];

            if (isLoadMore) {
                setTrendingPapers(prev => [...prev, ...newPapers]);
                setOffset(prev => prev + 10);
            } else {
                setTrendingPapers(newPapers);
                setOffset(10); // Ready for next page
            }

            if (newPapers.length < 10) setHasMore(false);

        } catch (e) {
            console.error(e);
        } finally {
            setLoadingTrending(false);
            setLoadingMore(false);
        }
    };

    const fetchForYou = async () => {
        if (recommendedPapers.length > 0) return;
        setLoadingForYou(true);

        try {
            // 1. Need My Tags
            const { data: tagsData } = await supabase.from('tags').select('name').order('usage_count', { ascending: false }).limit(10);
            const userTags = tagsData?.map(t => t.name) || [];

            // 2. Need Trending Papers (reuse if exists, else fetch)
            let candidates = trendingPapers;
            if (candidates.length === 0) {
                const res = await fetch('/api/fetch-trending', {
                    method: 'POST',
                    body: JSON.stringify({ source: 'daily', count: 15 }) // Use daily for recommendations base
                });
                const data = await res.json();
                candidates = data.papers || [];
                if (trendingPapers.length === 0) setTrendingPapers(candidates); // Cache it
            }

            // 3. Get Recommendations
            const recRes = await fetch('/api/recommend-papers', {
                method: 'POST',
                body: JSON.stringify({ user_tags: userTags, recent_papers: candidates })
            });
            const recData = await recRes.json();
            setRecommendedPapers(recData.papers || []);

        } catch (e) {
            console.error(e);
        } finally {
            setLoadingForYou(false);
        }
    };

    // Tab Switching Logic
    useEffect(() => {
        if (activeTab === 'trending') fetchTrending();
        if (activeTab === 'for_you') fetchForYou();
    }, [activeTab]);

    const handleAddPaper = async (paper: any) => {
        // Add to Supabase
        const newPaper = {
            title: paper.title,
            authors: paper.authors,
            link: paper.link,
            tags: paper.tags || [],
            status: 'unread',
            memo: paper.tldr_kr
        };

        const { error } = await supabase.from('papers').insert([newPaper]);
        if (!error) {
            alert('Added to library!');
            fetchMyPapers(); // Refresh my papers
        } else {
            alert('Failed to add');
        }
    };

    const handleQuickAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setAdding(true);
        try {
            const res = await fetch('/api/ai/parse-paper', {
                method: 'POST',
                body: JSON.stringify({ input })
            });
            const { paper } = await res.json();
            if (paper) {
                await supabase.from('papers').insert([paper]);
                fetchMyPapers();
                setInput('');
            }
        } catch (e) {
            console.error(e);
            alert('AI Parse failed. Try Manual Add.');
            setManualAddModal(true);
        } finally {
            setAdding(false);
        }
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const { error } = await supabase.from('papers').insert([newPaper]);
        if (!error) {
            setManualAddModal(false);
            setNewPaper({ title: '', authors: '', link: '', status: 'unread', memo: '' });
            fetchMyPapers();
        } else {
            alert('Failed to save paper');
        }
    };

    const handleUpdatePaper = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPaper) return;

        const { error } = await supabase.from('papers').update({
            memo: editingPaper.memo,
            status: editingPaper.status,
            tags: editingPaper.tags
        }).eq('id', editingPaper.id);

        if (!error) {
            setEditingPaper(null);
            fetchMyPapers();
        } else {
            alert('Failed to update');
        }
    };

    const deletePaper = async (id: string) => {
        if (confirm('Are you sure you want to delete this paper?')) {
            await supabase.from('papers').delete().eq('id', id);
            setMyPapers(myPapers.filter(p => p.id !== id));
        }
    };

    return (
        <div className="space-y-6 relative">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">Papers</h1>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('my_papers')}
                    className={`pb-3 px-2 font-medium transition-colors ${activeTab === 'my_papers' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    My Papers
                </button>
                <button
                    onClick={() => setActiveTab('trending')}
                    className={`pb-3 px-2 font-medium transition-colors ${activeTab === 'trending' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Trending
                </button>
                <button
                    onClick={() => setActiveTab('for_you')}
                    className={`pb-3 px-2 font-medium transition-colors ${activeTab === 'for_you' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    For You <Sparkles size={14} className="inline ml-1 text-yellow-500" />
                </button>
            </div>

            {/* Content */}
            <div className="min-h-[50vh]">
                {activeTab === 'my_papers' && (
                    <div className="space-y-6">
                        {/* Add Area */}
                        <div className="flex gap-2">
                            <form onSubmit={handleQuickAdd} className="flex gap-2 flex-1">
                                <input
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    placeholder="Paste link or citation (AI Auto-fill)..."
                                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={adding}
                                />
                                <button
                                    type="submit"
                                    disabled={adding}
                                    className="bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-800 disabled:opacity-50 whitespace-nowrap"
                                >
                                    {adding ? <Loader2 className="animate-spin" /> : 'AI Add'}
                                </button>
                            </form>
                            <button
                                onClick={() => setManualAddModal(true)}
                                className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 whitespace-nowrap"
                            >
                                Manual Add
                            </button>
                        </div>

                        {loadingMyParams ? <p>Loading...</p> : (
                            <div className="grid gap-4">
                                {myPapers.map(p => (
                                    <div
                                        key={p.id}
                                        onClick={() => setEditingPaper(p)}
                                        className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">{p.title}</h3>
                                                <p className="text-gray-600 text-sm mt-1">{p.authors}</p>
                                                <div className="flex gap-2 mt-3 items-center">
                                                    <span className={`px-2 py-0.5 rounded text-xs border ${p.status === 'read' ? 'bg-green-50 text-green-700 border-green-200' :
                                                        p.status === 'reading' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                            'bg-gray-50 text-gray-700 border-gray-200'
                                                        }`}>
                                                        {(p.status || 'unread').toUpperCase()}
                                                    </span>
                                                    {p.tags?.map((t: string) => (
                                                        <span key={t} className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-500">#{t}</span>
                                                    ))}
                                                    {p.memo && <span className="text-xs text-gray-400 flex items-center gap-1"><BookOpen size={12} /> Has Notes</span>}
                                                </div>
                                            </div>
                                            <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                                {p.link && (
                                                    <a href={p.link} target="_blank" className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
                                                        <ExternalLink size={20} />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'trending' && (
                    <div className="space-y-6">
                        <div className="flex flex-col gap-4">
                            <div className="flex justify-between items-center">
                                <div className="flex gap-2">
                                    {['daily', 'trending', 'deepseek', 'bytedance'].map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => { setTrendingSource(s as any); fetchTrending(s); }}
                                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${trendingSource === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                        >
                                            {s.charAt(0).toUpperCase() + s.slice(1)}
                                        </button>
                                    ))}
                                </div>
                                <button onClick={() => fetchTrending()} className="text-sm text-blue-600 flex items-center gap-1">
                                    <RefreshCw size={14} /> Refresh
                                </button>
                            </div>
                        </div>
                        {loadingTrending ? (
                            <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-600" size={32} /></div>
                        ) : (
                            <div className="grid gap-4">
                                {trendingPapers.map((p, idx) => (
                                    <div key={idx} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-semibold text-lg text-gray-900">{p.title}</h3>
                                            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">{p.source || 'HF'}</span>
                                        </div>
                                        {/* Date/Source Info */}
                                        {p.publishedAt && (
                                            <p className="text-gray-400 text-xs mt-1">
                                                {new Date(p.publishedAt).toLocaleDateString()}
                                            </p>
                                        )}
                                        <p className="text-gray-600 text-sm mt-1">{p.authors}</p>

                                        <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-700">
                                            <span className="font-bold mr-2">TLDR (KR):</span>
                                            {p.tldr_kr}
                                        </div>

                                        <div className="mt-4 flex gap-3">
                                            <button
                                                onClick={() => handleAddPaper(p)}
                                                className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                                            >
                                                + Add to My Papers
                                            </button>
                                            <a href={p.link} target="_blank" className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 text-gray-700">
                                                View Arxiv
                                            </a>
                                        </div>
                                    </div>
                                ))}

                                {/* Load More Button for Collections */}
                                {(trendingSource === 'deepseek' || trendingSource === 'bytedance') && hasMore && (
                                    <div className="flex justify-center mt-6">
                                        <button
                                            onClick={() => fetchTrending(undefined, true)}
                                            disabled={loadingMore}
                                            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                                        >
                                            {loadingMore ? <Loader2 className="animate-spin" size={16} /> : <ChevronDown size={16} />}
                                            Load More
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'for_you' && (
                    <div className="space-y-6">
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-100">
                            <h2 className="text-blue-900 font-semibold flex items-center gap-2">
                                <Sparkles size={18} className="text-blue-600" />
                                AI Recommended for You
                            </h2>
                            <p className="text-blue-700 text-sm mt-1">Based on your tags and reading patterns.</p>
                        </div>

                        {loadingForYou ? (
                            <div className="flex justify-center p-10"><Loader2 className="animate-spin text-purple-600" size={32} /></div>
                        ) : (
                            <div className="grid gap-4">
                                {recommendedPapers.length === 0 ? <p className="text-gray-500">No specific recommendations found today.</p> : recommendedPapers.map((p, idx) => (
                                    <div key={idx} className="bg-white p-4 rounded-lg border border-purple-100 shadow-sm hover:shadow-md transition-shadow ring-1 ring-purple-50">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-semibold text-lg text-gray-900">{p.title}</h3>
                                            <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">Recommended</span>
                                        </div>
                                        <p className="text-sm text-purple-600 mt-2 font-medium">✨ {p.relevance_reason}</p>
                                        <p className="text-gray-600 text-sm mt-1">{p.authors}</p>

                                        <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-700">
                                            <span className="font-bold mr-2">TLDR (KR):</span>
                                            {p.tldr_kr}
                                        </div>

                                        <div className="mt-4 flex gap-3">
                                            <button
                                                onClick={() => handleAddPaper(p)}
                                                className="px-4 py-2 bg-black text-white rounded text-sm hover:bg-gray-800 transition-colors"
                                            >
                                                + Add to Library
                                            </button>
                                            <a href={p.link} target="_blank" className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 text-gray-700">
                                                View Arxiv
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Manual Add Modal */}
            {manualAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl">
                        <h2 className="text-xl font-bold mb-4">Add Paper Manually</h2>
                        <form onSubmit={handleManualSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input required className="w-full p-2 border rounded" value={newPaper.title} onChange={e => setNewPaper({ ...newPaper, title: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Authors</label>
                                <input className="w-full p-2 border rounded" value={newPaper.authors} onChange={e => setNewPaper({ ...newPaper, authors: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Link</label>
                                <input className="w-full p-2 border rounded" value={newPaper.link} onChange={e => setNewPaper({ ...newPaper, link: e.target.value })} />
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setManualAddModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save Paper</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Paper Modal */}
            {editingPaper && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl h-[80vh] flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-xl font-bold pr-8">{editingPaper.title}</h2>
                            <button onClick={() => setEditingPaper(null)} className="text-gray-400 hover:text-gray-600"><Plus className="rotate-45" size={24} /></button>
                        </div>

                        <form onSubmit={handleUpdatePaper} className="flex-1 flex flex-col space-y-4 overflow-y-auto">
                            <div className="flex gap-4 p-2 bg-gray-50 rounded-lg">
                                <FormSelect
                                    label="Status"
                                    value={editingPaper.status}
                                    onChange={(v: string) => setEditingPaper({ ...editingPaper, status: v })}
                                    options={['unread', 'reading', 'read']}
                                />
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Link</label>
                                    <a href={editingPaper.link} target="_blank" className="text-blue-600 hover:underline text-sm truncate block">{editingPaper.link || 'No link'}</a>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col min-h-0">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes & Thoughts</label>
                                <RichTextEditor
                                    value={editingPaper.memo || ''}
                                    onChange={val => setEditingPaper((prev: any) => ({ ...prev, memo: val }))}
                                    minHeight="300px"
                                />
                                <Backlinks currentId={editingPaper.id} currentTitle={editingPaper.title} />
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t mt-auto">
                                <button
                                    type="button"
                                    onClick={() => { deletePaper(editingPaper.id); setEditingPaper(null); }}
                                    className="text-red-500 hover:bg-red-50 px-3 py-2 rounded text-sm"
                                >
                                    Delete Paper
                                </button>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setEditingPaper(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save Changes</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

const FormSelect = ({ label, value, onChange, options }: any) => (
    <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
        <select
            className="p-1.5 border rounded text-sm bg-white"
            value={value}
            onChange={e => onChange(e.target.value)}
        >
            {options.map((o: string) => <option key={o} value={o}>{o.toUpperCase()}</option>)}
        </select>
    </div>
);
