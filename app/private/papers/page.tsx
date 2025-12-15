'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { Plus, Loader2, Sparkles, BookOpen, ExternalLink, RefreshCw, ChevronDown, CheckCircle2, GraduationCap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import RichTextEditor from '@/app/components/RichTextEditor';
import Backlinks from '@/app/components/Backlinks';
import ViewToggle from '@/app/components/ViewToggle';

export default function PapersPage() {
    const [activeTab, setActiveTab] = useState<'my_papers' | 'trending' | 'for_you'>('my_papers');
    const [viewMode, setViewMode] = useState<'list' | 'card'>('list');

    // Data States
    const [myPapers, setMyPapers] = useState<any[]>([]);
    const [trendingPapers, setTrendingPapers] = useState<any[]>([]);
    const [recommendedPapers, setRecommendedPapers] = useState<any[]>([]);
    const [trendingSource, setTrendingSource] = useState<'daily' | 'trending' | 'deepseek' | 'bytedance'>('daily');
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [dateMargin, setDateMargin] = useState('');

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

    const fetchForYou = async (isRefresh = false) => {
        setLoadingForYou(true);
        if (isRefresh) {
            // Calculate date from dropdown value or default to 3 months
            const calculateDate = (val: string) => {
                const now = new Date();
                switch (val) {
                    case '1week': now.setDate(now.getDate() - 7); break;
                    case '2weeks': now.setDate(now.getDate() - 14); break;
                    case '1month': now.setMonth(now.getMonth() - 1); break;
                    case '6months': now.setMonth(now.getMonth() - 6); break;
                    case '1year': now.setFullYear(now.getFullYear() - 1); break;
                    case '2years': now.setFullYear(now.getFullYear() - 2); break;
                    default: now.setMonth(now.getMonth() - 3); break; // Default 3 months
                }
                return now.toISOString().split('T')[0];
            };

            const dateStr = calculateDate(dateMargin);

            // Trigger new search
            try {
                const res = await fetch('/api/scholar-inbox', {
                    method: 'POST',
                    body: JSON.stringify({ dateMargin: dateStr })
                });
                const data = await res.json();
                if (data.papers) {
                    setRecommendedPapers(prev => [...data.papers, ...prev]);
                }
                await fetchInboxFromDB(); // Reload from DB to be safe/consistent
            } catch (e) {
                console.error("Scholar Search Failed", e);
                alert("Failed to fetch new items from Scholar Inbox.");
            } finally {
                setLoadingForYou(false);
            }
            return;
        }

        // Default: Just load from DB
        if (recommendedPapers.length === 0) {
            await fetchInboxFromDB();
        }
        setLoadingForYou(false);
    };

    const fetchInboxFromDB = async () => {
        const { data } = await supabase
            .from('papers')
            .select('*')
            .contains('tags', ['Scholar Inbox'])
            .order('created_at', { ascending: false })
            .limit(20);

        if (data) setRecommendedPapers(data);
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
            tags: (paper.tags || []).filter((t: string) => t !== 'X' && t !== 'Scholar Inbox'),
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

    const updateStatus = async (id: string, status: string) => {
        const { error } = await supabase.from('papers').update({ status }).eq('id', id);
        if (!error) {
            // Update local state in all lists to reflect change
            setMyPapers(prev => prev.map(p => p.id === id ? { ...p, status } : p));
            setRecommendedPapers(prev => prev.map(p => p.id === id ? { ...p, status } : p));
            setTrendingPapers(prev => prev.map(p => p.id === id ? { ...p, status } : p));
        } else {
            console.error("Failed to update status", error);
        }
    };

    const deletePaper = async (id: string) => {
        if (confirm('Are you sure you want to delete this paper?')) {
            await supabase.from('papers').delete().eq('id', id);
            setMyPapers(myPapers.filter(p => p.id !== id));
            setRecommendedPapers(recommendedPapers.filter(p => p.id !== id)); // Also remove from recs if there
        }
    };

    const formatAuthors = (authors: string) => {
        if (!authors) return '';
        const list = authors.split(',').map(a => a.trim());
        if (list.length > 4) {
            return list.slice(0, 4).join(', ') + ' et al.';
        }
        return authors;
    };

    const getPreviewText = (memo: string) => {
        if (!memo) return '';
        // Check for explicit TLDR marker from Scholar Inbox
        const tldrMatch = memo.match(/\*\*TL;DR\*\*:\s*(.*)/);
        if (tldrMatch) return tldrMatch[1];

        // Fallback: just remove markdown formatting roughly and return first line
        return memo.replace(/[#*`_]/g, '').split('\n')[0];
    };

    return (
        <div className="space-y-6 relative">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-stone-100">Papers</h1>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-stone-800">
                <button
                    onClick={() => setActiveTab('my_papers')}
                    className={`pb-3 px-2 font-medium transition-colors ${activeTab === 'my_papers' ? 'border-b-2 border-amber-500 text-amber-500' : 'text-stone-500 hover:text-stone-300'}`}
                >
                    My Papers
                </button>
                <button
                    onClick={() => setActiveTab('trending')}
                    className={`pb-3 px-2 font-medium transition-colors ${activeTab === 'trending' ? 'border-b-2 border-amber-500 text-amber-500' : 'text-stone-500 hover:text-stone-300'}`}
                >
                    Trending
                </button>
                <button
                    onClick={() => setActiveTab('for_you')}
                    className={`pb-3 px-2 font-medium transition-colors ${activeTab === 'for_you' ? 'border-b-2 border-amber-500 text-amber-500' : 'text-stone-500 hover:text-stone-300'}`}
                >
                    For You <Sparkles size={14} className="inline ml-1 text-amber-400" />
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
                                    className="flex-1 p-3 bg-stone-900 border border-stone-800 rounded-lg text-stone-200 placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-900/50"
                                    disabled={adding}
                                />
                                <button
                                    type="submit"
                                    disabled={adding}
                                    className="bg-stone-100 text-stone-950 px-6 py-3 rounded-lg hover:bg-white disabled:opacity-50 whitespace-nowrap font-medium"
                                >
                                    {adding ? <Loader2 className="animate-spin" /> : 'AI Add'}
                                </button>
                            </form>
                            <button
                                onClick={() => setManualAddModal(true)}
                                className="px-4 py-3 border border-stone-700 rounded-lg hover:bg-stone-800 text-stone-300 whitespace-nowrap transition-colors"
                            >
                                Manual Add
                            </button>
                            <div className="ml-auto">
                                <ViewToggle view={viewMode} onChange={setViewMode} />
                            </div>
                        </div>

                        {loadingMyParams ? <p className="text-stone-500">Loading...</p> : (
                            <div className={viewMode === 'card' ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "grid gap-4"}>
                                {myPapers.filter(p => !p.tags?.includes('Scholar Inbox') && !p.tags?.includes('X')).map(p => (
                                    <div
                                        key={p.id}
                                        onClick={() => setEditingPaper(p)}
                                        className={`bg-stone-900 p-4 rounded-lg border border-stone-800 shadow-sm hover:shadow-md hover:border-amber-900/40 transition-all cursor-pointer group ${viewMode === 'card' ? 'flex flex-col h-full' : ''}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex-1 min-w-0 pr-4">
                                                <h3 className="font-semibold text-lg text-stone-200 group-hover:text-amber-500 transition-colors line-clamp-2">{p.title}</h3>
                                                <p className="text-stone-500 text-sm mt-1">{formatAuthors(p.authors)}</p>

                                                {viewMode === 'list' && p.memo && (
                                                    <div className="flex items-start gap-2 mt-2 text-sm text-stone-500">
                                                        <BookOpen size={14} className="mt-0.5 text-blue-400 shrink-0" />
                                                        <span className="line-clamp-1">{getPreviewText(p.memo)}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                                                <a
                                                    href={`https://scholar.google.com/scholar?q=${encodeURIComponent(p.title)}`}
                                                    target="_blank"
                                                    className="p-2 text-stone-500 hover:text-blue-400 hover:bg-stone-800 rounded-full transition-colors"
                                                    title="Search on Google Scholar"
                                                >
                                                    <GraduationCap size={20} />
                                                </a>
                                                {p.link && (
                                                    <a href={p.link} target="_blank" className="p-2 text-stone-500 hover:text-amber-500 hover:bg-stone-800 rounded-full transition-colors">
                                                        <ExternalLink size={20} />
                                                    </a>
                                                )}
                                            </div>
                                        </div>

                                        {viewMode === 'card' && p.memo && (
                                            <div className="mb-3 p-3 bg-stone-950/50 rounded text-sm text-stone-400 prose prose-sm prose-invert max-w-none line-clamp-6 prose-img:rounded-md flex-1 border border-stone-800/50">
                                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                    {p.memo}
                                                </ReactMarkdown>
                                            </div>
                                        )}

                                        <div className="flex gap-2 mt-auto items-center">
                                            <span className={`px-2 py-0.5 rounded text-xs border ${p.status === 'read' ? 'bg-green-900/20 text-green-400 border-green-500/20' :
                                                p.status === 'reading' ? 'bg-blue-900/20 text-blue-400 border-blue-500/20' :
                                                    'bg-stone-800 text-stone-400 border-stone-700'
                                                }`}>
                                                {(p.status || 'unread').toUpperCase()}
                                            </span>
                                            {p.tags?.map((t: string) => (
                                                <span key={t} className="px-2 py-0.5 rounded text-xs bg-stone-800 text-stone-500 border border-stone-700">#{t}</span>
                                            ))}
                                            {viewMode === 'list' && p.memo && <span className="text-xs text-stone-600 flex items-center gap-1"><BookOpen size={12} /> Has Notes</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'for_you' && (
                    <div className="space-y-6">
                        <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 p-4 rounded-lg border border-blue-500/10">
                            <h2 className="text-blue-300 font-semibold flex items-center gap-2">
                                <Sparkles size={18} className="text-blue-400" />
                                AI Recommended for You
                            </h2>
                            <p className="text-blue-400/70 text-sm mt-1">Based on your tags and reading patterns.</p>
                        </div>

                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-stone-500">Search Since:</span>
                                <select
                                    className="text-sm border border-stone-700 rounded p-1 bg-stone-900 text-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-600"
                                    value={dateMargin}
                                    onChange={(e) => setDateMargin(e.target.value)}
                                >
                                    <option value="">Last 3 Months (Default)</option>
                                    <option value="1week">Last 1 Week</option>
                                    <option value="2weeks">Last 2 Weeks</option>
                                    <option value="1month">Last 1 Month</option>
                                    <option value="6months">Last 6 Months</option>
                                    <option value="1year">Last 1 Year</option>
                                    <option value="2years">Last 2 Years</option>
                                </select>
                            </div>
                            <button
                                onClick={() => fetchForYou(true)}
                                disabled={loadingForYou}
                                className="text-xs bg-purple-900/30 text-purple-300 px-3 py-1.5 rounded-full hover:bg-purple-900/50 transition-colors flex items-center gap-1 disabled:opacity-50 border border-purple-500/20"
                            >
                                <RefreshCw size={12} className={loadingForYou ? "animate-spin" : ""} />
                                {loadingForYou ? "Searching..." : "Check for Updates"}
                            </button>
                        </div>

                        {loadingForYou ? (
                            <div className="flex justify-center p-10"><Loader2 className="animate-spin text-purple-500" size={32} /></div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm text-stone-500">Items found by your Scholar Agent.</p>
                                <div className="grid gap-4">
                                    {recommendedPapers.length === 0 ? (
                                        <div className="text-center py-10 bg-stone-900/50 rounded-lg border border-dashed border-stone-800 text-stone-500">
                                            No inbox items yet. Click "Check for Updates" to start your agent.
                                        </div>
                                    ) : recommendedPapers.map((p, idx) => {
                                        const duplicateItem = myPapers.find(mp => (mp.link === p.link || mp.title === p.title) && mp.id !== p.id);
                                        const isDuplicate = !!duplicateItem;
                                        const isXSource = p.tags?.includes('X');

                                        return (
                                            <div key={idx} className="bg-stone-900 p-4 rounded-lg border border-stone-800 shadow-sm hover:shadow-md transition-all hover:border-purple-500/30 group">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold text-lg text-stone-200 leading-snug">{p.title}</h3>
                                                        {isDuplicate && (
                                                            <div className="text-xs text-orange-400 flex items-center gap-1 mt-1">
                                                                <span className="font-bold">⚠️ Already in Library:</span> {duplicateItem.title}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 ml-2 shrink-0">
                                                        <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${isXSource ? 'bg-stone-800 text-stone-300 border border-stone-700' : 'bg-blue-900/20 text-blue-300 border border-blue-500/20'}`}>
                                                            {isXSource ? 'Source: X' : 'Source: Web'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {p.authors && <p className="text-stone-500 text-sm mt-1">{p.authors}</p>}

                                                <div className="mt-3 p-3 bg-stone-950/50 rounded text-sm text-stone-400 border border-stone-800/50">
                                                    <span className="font-bold mr-2 text-purple-400">TLDR:</span>
                                                    {p.memo || p.tldr_kr}
                                                </div>

                                                <div className="mt-4 flex gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={async (e) => {
                                                            const btn = e.currentTarget;
                                                            btn.disabled = true;
                                                            btn.innerText = "Adding...";

                                                            const newTags = (p.tags || []).filter((t: string) => t !== 'Scholar Inbox' && t !== 'X');

                                                            const { error } = await supabase.from('papers').update({
                                                                tags: newTags,
                                                                status: 'unread'
                                                            }).eq('id', p.id);

                                                            if (!error) {
                                                                btn.innerText = "Added to Library!";
                                                                btn.className = "px-4 py-2 rounded text-sm bg-green-900/20 text-green-400 border border-green-500/20 cursor-default";
                                                            } else {
                                                                btn.disabled = false;
                                                                btn.innerText = "Failed";
                                                            }
                                                        }}
                                                        disabled={isDuplicate}
                                                        className={`px-4 py-2 rounded text-sm transition-colors font-medium ${isDuplicate ? 'bg-stone-800 text-stone-600 cursor-not-allowed border border-stone-800' : 'bg-stone-100 text-stone-900 hover:bg-white'}`}
                                                    >
                                                        {isDuplicate ? 'Already in Library' : 'Add to Reading List'}
                                                    </button>
                                                    <a href={p.link} target="_blank" className="px-4 py-2 border border-stone-700 rounded text-sm hover:bg-stone-800 text-stone-300 flex items-center gap-1 transition-colors">
                                                        View Source <ExternalLink size={14} />
                                                    </a>
                                                    <button
                                                        onClick={() => deletePaper(p.id)}
                                                        className="px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                                                    >
                                                        Dismiss
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
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
                                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${trendingSource === s ? 'bg-blue-600 text-white' : 'bg-stone-800 text-stone-400 hover:bg-stone-700'}`}
                                        >
                                            {s.charAt(0).toUpperCase() + s.slice(1)}
                                        </button>
                                    ))}
                                </div>
                                <button onClick={() => fetchTrending()} className="text-sm text-blue-400 flex items-center gap-1 hover:text-blue-300">
                                    <RefreshCw size={14} /> Refresh
                                </button>
                            </div>
                        </div>
                        {loadingTrending ? (
                            <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
                        ) : (
                            <div className="grid gap-4">
                                {trendingPapers.map((p, idx) => (
                                    <div key={idx} className="bg-stone-900 p-4 rounded-lg border border-stone-800 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-semibold text-lg text-stone-200">{p.title}</h3>
                                            <span className="bg-amber-900/20 text-amber-500 border border-amber-500/20 text-xs px-2 py-1 rounded">{p.source || 'HF'}</span>
                                        </div>
                                        {p.publishedAt && (
                                            <p className="text-stone-500 text-xs mt-1">
                                                {new Date(p.publishedAt).toLocaleDateString()}
                                            </p>
                                        )}
                                        <p className="text-stone-400 text-sm mt-1">{p.authors}</p>

                                        <div className="mt-3 p-3 bg-stone-950/50 rounded text-sm text-stone-400 border border-stone-800/50">
                                            <span className="font-bold mr-2 text-stone-500">TLDR (KR):</span>
                                            {p.tldr_kr}
                                        </div>

                                        <div className="mt-4 flex gap-3">
                                            <button
                                                onClick={() => handleAddPaper(p)}
                                                className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-500 transition-colors font-medium"
                                            >
                                                + Add to My Papers
                                            </button>
                                            <a href={p.link} target="_blank" className="px-4 py-2 border border-stone-700 rounded text-sm hover:bg-stone-800 text-stone-300">
                                                View Arxiv
                                            </a>
                                        </div>
                                    </div>
                                ))}

                                {(trendingSource === 'deepseek' || trendingSource === 'bytedance') && hasMore && (
                                    <div className="flex justify-center mt-6">
                                        <button
                                            onClick={() => fetchTrending(undefined, true)}
                                            disabled={loadingMore}
                                            className="flex items-center gap-2 bg-stone-800 text-stone-300 px-6 py-2 rounded-lg hover:bg-stone-700 transition-colors disabled:opacity-50"
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
            </div>

            {/* Manual Add Modal */}
            {
                manualAddModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-stone-900 rounded-xl max-w-lg w-full p-6 shadow-2xl border border-stone-800">
                            <h2 className="text-xl font-bold mb-4 text-stone-100">Add Paper Manually</h2>
                            <form onSubmit={handleManualSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-stone-400 mb-1">Title</label>
                                    <input required className="w-full p-3 bg-stone-950 border border-stone-800 rounded-lg text-stone-200 focus:outline-none focus:ring-2 focus:ring-blue-900/50" value={newPaper.title} onChange={e => setNewPaper({ ...newPaper, title: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-stone-400 mb-1">Authors</label>
                                    <input className="w-full p-3 bg-stone-950 border border-stone-800 rounded-lg text-stone-200 focus:outline-none focus:ring-2 focus:ring-blue-900/50" value={newPaper.authors} onChange={e => setNewPaper({ ...newPaper, authors: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-stone-400 mb-1">Link</label>
                                    <input className="w-full p-3 bg-stone-950 border border-stone-800 rounded-lg text-stone-200 focus:outline-none focus:ring-2 focus:ring-blue-900/50" value={newPaper.link} onChange={e => setNewPaper({ ...newPaper, link: e.target.value })} />
                                </div>
                                <div className="flex justify-end gap-2 mt-6">
                                    <button type="button" onClick={() => setManualAddModal(false)} className="px-4 py-2 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors">Cancel</button>
                                    <button type="submit" className="px-4 py-2 bg-stone-100 text-stone-950 rounded-lg hover:bg-white font-medium">Save Paper</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Edit Paper Modal */}
            {
                editingPaper && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-stone-900 rounded-xl max-w-2xl w-full p-6 shadow-2xl h-[80vh] flex flex-col border border-stone-800">
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-xl font-bold pr-8 text-stone-100">{editingPaper.title}</h2>
                                <button onClick={() => setEditingPaper(null)} className="text-stone-500 hover:text-stone-300 transition-colors"><Plus className="rotate-45" size={24} /></button>
                            </div>

                            <form onSubmit={handleUpdatePaper} className="flex-1 flex flex-col space-y-4 overflow-y-auto custom-scrollbar pr-2">
                                <div className="flex gap-4 p-3 bg-stone-950/50 rounded-lg border border-stone-800">
                                    <FormSelect
                                        label="Status"
                                        value={editingPaper.status}
                                        onChange={(v: string) => setEditingPaper({ ...editingPaper, status: v })}
                                        options={['unread', 'reading', 'read']}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <label className="block text-xs font-medium text-stone-500 mb-1">Link</label>
                                        <a href={editingPaper.link} target="_blank" className="text-blue-400 hover:text-blue-300 hover:underline text-sm truncate block">{editingPaper.link || 'No link'}</a>
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col min-h-0">
                                    <label className="block text-sm font-medium text-stone-400 mb-2">Notes & Thoughts</label>
                                    <RichTextEditor
                                        value={editingPaper.memo || ''}
                                        onChange={val => setEditingPaper((prev: any) => ({ ...prev, memo: val }))}
                                        minHeight="300px"
                                    />
                                    <Backlinks currentId={editingPaper.id} currentTitle={editingPaper.title} />
                                </div>

                                <div className="flex justify-between items-center pt-4 border-t border-stone-800 mt-auto">
                                    <button
                                        type="button"
                                        onClick={() => { deletePaper(editingPaper.id); setEditingPaper(null); }}
                                        className="text-red-400 hover:bg-red-900/20 hover:text-red-300 px-3 py-2 rounded text-sm transition-colors"
                                    >
                                        Delete Paper
                                    </button>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setEditingPaper(null)} className="px-4 py-2 text-stone-400 hover:bg-stone-800 hover:text-stone-200 rounded-lg transition-colors">Cancel</button>
                                        <button type="submit" className="px-4 py-2 bg-stone-100 text-stone-950 rounded-lg hover:bg-white font-medium transition-colors">Save Changes</button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

const FormSelect = ({ label, value, onChange, options }: any) => (
    <div>
        <label className="block text-xs font-medium text-stone-500 mb-1">{label}</label>
        <select
            className="p-1.5 border border-stone-700 rounded text-sm bg-stone-900 text-stone-200 focus:outline-none focus:ring-1 focus:ring-stone-600"
            value={value}
            onChange={e => onChange(e.target.value)}
        >
            {options.map((o: string) => <option key={o} value={o}>{o.toUpperCase()}</option>)}
        </select>
    </div>
);
