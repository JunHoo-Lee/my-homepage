'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { Plus, Loader2, Sparkles, BookOpen, ExternalLink, RefreshCw, ChevronDown, CheckCircle2, GraduationCap, ChevronLeft, ChevronRight, Search, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import RichTextEditor from '@/app/components/RichTextEditor';
import Backlinks from '@/app/components/Backlinks';
import ViewToggle from '@/app/components/ViewToggle';

export default function PapersPage() {
    const [activeTab, setActiveTab] = useState<'my_papers' | 'huggingface' | 'ai_search'>('my_papers');
    const [viewMode, setViewMode] = useState<'list' | 'card'>('list');

    // HuggingFace State
    const [hfSubTab, setHfSubTab] = useState<'trending' | 'daily' | 'weekly' | 'monthly' | 'youtube' | 'bytedance' | 'bair' | 'google_research'>('trending');
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

    // Data States
    const [myPapers, setMyPapers] = useState<any[]>([]);
    const [trendingPapers, setTrendingPapers] = useState<any[]>([]);
    const [recommendedPapers, setRecommendedPapers] = useState<any[]>([]); // For "For You" if needed or hidden
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    // AI Search State
    const [aiSearchMode, setAiSearchMode] = useState<'arxiv' | 'conference' | 'keyword'>('conference'); // Default to conference for visibility
    const [aiQuery, setAiQuery] = useState('');
    const [aiConferenceName, setAiConferenceName] = useState('');
    const [aiDateMargin, setAiDateMargin] = useState('2024-01-01');
    const [aiResults, setAiResults] = useState<any[]>([]);
    const [loadingAi, setLoadingAi] = useState(false);

    // Loading States
    const [loadingMyParams, setLoadingMyParams] = useState(true);
    const [loadingTrending, setLoadingTrending] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    // Analysis State
    const [analyzing, setAnalyzing] = useState<Record<string, boolean>>({});
    const [analysisResults, setAnalysisResults] = useState<Record<string, string>>({}); // id -> tldr

    // Input State (Local Add)
    const [input, setInput] = useState('');
    const [adding, setAdding] = useState(false);

    // Action States
    const [actionStates, setActionStates] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});

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

    const fetchTrending = async (isLoadMore = false) => {
        if (isLoadMore) {
            setLoadingMore(true);
        } else {
            setLoadingTrending(true);
            setTrendingPapers([]);
            setOffset(0);
            setHasMore(true);
        }

        const currentOffset = isLoadMore ? offset : 0;
        // Map subtabs to sources
        // trending -> 'trending'
        // daily -> 'daily' (requires date)
        // weekly -> map to trending for now or not implemented
        // monthly -> map to trending for now or not implemented

        // Pass the subTab directly as source for the new feeds
        let source = hfSubTab;
        if (hfSubTab === 'daily') source = 'daily';

        try {
            const body: any = { source, count: 10, offset: currentOffset };
            if (hfSubTab === 'daily') {
                body.date = selectedDate;
            }

            const res = await fetch('/api/fetch-trending', {
                method: 'POST',
                body: JSON.stringify(body)
            });
            const data = await res.json();
            const newPapers = data.papers || [];

            if (isLoadMore) {
                setTrendingPapers(prev => [...prev, ...newPapers]);
                setOffset(prev => prev + 10);
            } else {
                setTrendingPapers(newPapers);
                setOffset(10);
            }

            // If we get fewer results than requested, no more papers
            if (newPapers.length < 10) setHasMore(false);

        } catch (e) {
            console.error(e);
        } finally {
            setLoadingTrending(false);
            setLoadingMore(false);
        }
    };

    const handleAiSearch = async () => {
        setLoadingAi(true);
        setAiResults([]);
        try {
            let body: any = {};

            if (aiSearchMode === 'arxiv') {
                // Legacy Arxiv Search
                const res = await fetch('/api/arxiv-search', {
                    method: 'POST',
                    body: JSON.stringify({ query: aiQuery })
                });
                const data = await res.json();
                setAiResults(data.papers || []);
            } else {
                // New Agentic Search
                body = {
                    mode: aiSearchMode,
                    query: aiQuery,
                    dateLimit: aiDateMargin,
                    conferenceName: aiConferenceName
                };

                const res = await fetch('/api/ai-search', {
                    method: 'POST',
                    body: JSON.stringify(body)
                });
                const data = await res.json();

                // Map results to UI format if needed
                // API returns ScholarInboxItem[]: { title, authors, link, tldr, relevance_reason, source, published_date }
                // UI expects: { title, authors, summary (mapped from tldr), link, published (mapped from published_date), pdf? }
                const mapped = (data.papers || []).map((p: any) => ({
                    ...p,
                    summary: `**TL;DR**: ${p.tldr}\n\n**Reason**: ${p.relevance_reason}`,
                    published: p.published_date || new Date().toISOString()
                }));
                setAiResults(mapped);
            }
        } catch (e: any) {
            console.error(e);
            alert(`Search failed: ${e.message}`);
        } finally {
            setLoadingAi(false);
        }
    };

    const handleRelatedSearch = async (paper: any) => {
        setActiveTab('ai_search');
        setAiSearchMode('keyword'); // Re-use keyword UI or generic
        // Actually best to auto-trigger the related search
        setLoadingAi(true);
        setAiResults([]);

        // We set query to title just for visibility
        setAiQuery(`Related to: ${paper.title}`);

        try {
            const res = await fetch('/api/ai-search', {
                method: 'POST',
                body: JSON.stringify({
                    mode: 'related',
                    targetPaperTitle: paper.title,
                    targetPaperContext: paper.abstract || paper.memo
                })
            });
            const data = await res.json();
            const mapped = (data.papers || []).map((p: any) => ({
                ...p,
                summary: `**Rel**: ${p.relevance_reason}\n\n${p.tldr}`,
                published: p.published_date
            }));
            setAiResults(mapped);
        } catch (e) {
            alert('Related search failed');
        } finally {
            setLoadingAi(false);
        }
    };

    // Effects
    useEffect(() => {
        if (activeTab === 'huggingface') {
            fetchTrending();
        }
    }, [activeTab, hfSubTab, selectedDate]);


    const handleAnalyze = async (paper: any) => {
        const id = paper.id || paper.link;
        if (analysisResults[id]) return; // Already analyzed

        setAnalyzing(prev => ({ ...prev, [id]: true }));
        try {
            const res = await fetch('/api/analyze-paper', {
                method: 'POST',
                body: JSON.stringify({
                    title: paper.title,
                    abstract: paper.abstract || paper.summary
                })
            });
            const data = await res.json();
            if (data.tldr) {
                setAnalysisResults(prev => ({ ...prev, [id]: data.tldr }));
            }
        } catch (e) {
            console.error(e);
            alert('Analysis failed');
        } finally {
            setAnalyzing(prev => ({ ...prev, [id]: false }));
        }
    };

    const handleAddToLibrary = async (paper: any) => {
        const id = paper.id || paper.link;
        setActionStates(prev => ({ ...prev, [id]: 'loading' }));

        const tldr = analysisResults[id] || paper.tldr_kr || paper.memo;

        const newPaper = {
            title: paper.title,
            authors: paper.authors,
            link: paper.link,
            tags: (paper.tags || []).filter((t: string) => t !== 'X' && t !== 'Scholar Inbox'),
            status: 'unread',
            memo: tldr
        };

        const { error } = await supabase.from('papers').insert([newPaper]);
        if (!error) {
            setActionStates(prev => ({ ...prev, [id]: 'success' }));
            fetchMyPapers();
            setTimeout(() => {
                setActionStates(prev => ({ ...prev, [id]: 'idle' }));
            }, 2000);
        } else {
            console.error(error);
            alert('Failed to add');
            setActionStates(prev => ({ ...prev, [id]: 'error' }));
        }
    };

    // Existing helper functions
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
        if (!confirm('Are you sure you want to delete this paper?')) return false;
        try {
            const { error, count } = await supabase.from('papers').delete({ count: 'exact' }).eq('id', id);
            if (error) throw error;
            if (count === 0) {
                alert('Delete failed: Item not found.');
                return false;
            }
            setMyPapers(prev => prev.filter(p => p.id !== id));
            fetchMyPapers();
            return true;
        } catch (error: any) {
            console.error('Delete failed:', error);
            return false;
        }
    };

    const formatAuthors = (authors: string) => {
        if (!authors) return '';
        const list = authors.split(',').map(a => a.trim());
        if (list.length > 4) return list.slice(0, 4).join(', ') + ' et al.';
        return authors;
    };

    const getPreviewText = (memo: string) => {
        if (!memo) return '';
        const tldrMatch = memo.match(/\*\*TL;DR\*\*:\s*(.*)/);
        if (tldrMatch) return tldrMatch[1];
        return memo.replace(/[#*`_]/g, '').split('\n')[0];
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


    return (
        <div className="space-y-6 relative pb-8">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl lg:text-3xl font-bold text-stone-100">Papers</h1>
            </div>

            {/* Tabs - Scrollable on Mobile */}
            <div className="flex gap-4 border-b border-stone-800 overflow-x-auto no-scrollbar whitespace-nowrap">
                <button onClick={() => setActiveTab('my_papers')} className={`pb-3 px-2 text-sm lg:text-base font-medium transition-colors shrink-0 ${activeTab === 'my_papers' ? 'border-b-2 border-amber-500 text-amber-500' : 'text-stone-500 hover:text-stone-300'}`}>My Papers</button>
                <button onClick={() => setActiveTab('huggingface')} className={`pb-3 px-2 text-sm lg:text-base font-medium transition-colors shrink-0 ${activeTab === 'huggingface' ? 'border-b-2 border-amber-500 text-amber-500' : 'text-stone-500 hover:text-stone-300'}`}>HuggingFace</button>
                <button onClick={() => setActiveTab('ai_search')} className={`pb-3 px-2 text-sm lg:text-base font-medium transition-colors shrink-0 ${activeTab === 'ai_search' ? 'border-b-2 border-amber-500 text-amber-500' : 'text-stone-500 hover:text-stone-300'}`}>AI Discovery</button>
            </div>

            {/* Content */}
            <div className="min-h-[50vh]">

                {/* MY PAPERS TAB */}
                {activeTab === 'my_papers' && (
                    <div className="space-y-4 lg:space-y-6">
                        <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
                            <form onSubmit={handleQuickAdd} className="flex gap-2 flex-1 min-w-0">
                                <input value={input} onChange={e => setInput(e.target.value)} placeholder="Paste link or citation..." className="flex-1 min-w-0 p-3 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-900/50 text-sm" disabled={adding} />
                                <button type="submit" disabled={adding} className="bg-stone-100 text-stone-950 px-4 lg:px-6 py-3 rounded-xl hover:bg-white disabled:opacity-50 whitespace-nowrap font-bold text-sm h-[46px] flex items-center justify-center min-w-[80px]">{adding ? <Loader2 className="animate-spin" size={18} /> : 'AI Add'}</button>
                            </form>
                            <div className="flex gap-2 w-full lg:w-auto">
                                <button onClick={() => setManualAddModal(true)} className="flex-1 lg:flex-none px-4 py-3 border border-stone-800 bg-stone-900/50 rounded-xl hover:bg-stone-800 text-stone-300 whitespace-nowrap transition-colors text-sm font-medium h-[46px]">Manual Add</button>
                                <div className="shrink-0"><ViewToggle view={viewMode} onChange={setViewMode} /></div>
                            </div>
                        </div>

                        {loadingMyParams ? <p className="text-stone-500 px-4">Loading...</p> : (
                            <div className="px-2 lg:px-0">
                                <div className={viewMode === 'card' ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "grid gap-4"}>
                                    {myPapers.filter(p => !p.tags?.includes('Scholar Inbox') && !p.tags?.includes('X')).map(p => (
                                        <div key={p.id} onClick={() => setEditingPaper(p)} className={`bg-stone-900 p-4 lg:p-6 rounded-2xl border border-stone-800 shadow-sm hover:shadow-xl hover:border-amber-900/40 transition-all cursor-pointer group flex flex-col ${viewMode === 'card' ? 'h-full' : ''}`}>
                                            <div className="flex justify-between items-start mb-4 gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-base lg:text-lg text-stone-100 group-hover:text-amber-500 transition-colors leading-tight tracking-tight">{p.title}</h3>
                                                    <p className="text-stone-500 text-[11px] lg:text-sm mt-1.5 font-medium">{formatAuthors(p.authors)}</p>
                                                    {viewMode === 'list' && p.memo && (
                                                        <div className="mt-4 p-4 bg-stone-950/60 rounded-xl border border-stone-800/50 text-[13px] text-stone-300 prose prose-sm prose-invert max-w-none">
                                                            <ReactMarkdown
                                                                remarkPlugins={[remarkMath]}
                                                                rehypePlugins={[rehypeKatex]}
                                                                components={{
                                                                    img: ({ node, ...props }) => <img {...props} className="max-w-full h-auto rounded-xl my-4 mx-auto border border-stone-800 shadow-lg" />
                                                                }}
                                                            >
                                                                {p.memo}
                                                            </ReactMarkdown>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                                    <a href={`https://scholar.google.com/scholar?q=${encodeURIComponent(p.title)}`} target="_blank" className="p-2 text-stone-600 hover:text-blue-400 hover:bg-stone-800/50 rounded-xl transition-all"><GraduationCap size={18} /></a>
                                                    {p.link && <a href={p.link} target="_blank" className="p-2 text-stone-600 hover:text-amber-500 hover:bg-stone-800/50 rounded-xl transition-all"><ExternalLink size={18} /></a>}
                                                </div>
                                            </div>
                                            {viewMode === 'card' && p.memo && (
                                                <div className="mb-4 p-4 bg-stone-950/50 rounded-xl text-[13px] text-stone-300 prose prose-sm prose-invert max-w-none prose-img:rounded-xl prose-img:mx-auto prose-img:border prose-img:border-stone-800 flex-1 border border-stone-800/50 leading-relaxed custom-scrollbar">
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkMath]}
                                                        rehypePlugins={[rehypeKatex]}
                                                        components={{
                                                            img: ({ node, ...props }) => <img {...props} className="max-w-full h-auto rounded-xl my-4 mx-auto border border-stone-800 shadow-lg" />
                                                        }}
                                                    >
                                                        {p.memo}
                                                    </ReactMarkdown>
                                                </div>
                                            )}
                                            <div className="flex flex-wrap gap-2 mt-auto items-center pt-4 border-t border-stone-800/30">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-black border tracking-tighter ${p.status === 'read' ? 'bg-green-950/30 text-green-400 border-green-900/40' : p.status === 'reading' ? 'bg-blue-950/30 text-blue-400 border-blue-900/40' : 'bg-stone-800/50 text-stone-500 border-stone-700'}`}>{p.status || 'unread'}</span>
                                                {p.tags?.filter((t: string) => t !== 'X' && t !== 'Scholar Inbox').map((t: string) => <span key={t} className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-950/50 text-stone-500 border border-stone-800 transition-colors group-hover:border-stone-700">#{t}</span>)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* HUGGINGFACE TAB */}
                {activeTab === 'huggingface' && (
                    <div className="space-y-4 lg:space-y-6">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-2 p-1 lg:p-1.5 bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
                            <div className="flex gap-1 p-1 overflow-x-auto no-scrollbar whitespace-nowrap">
                                {['trending', 'daily', 'weekly', 'monthly'].map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setHfSubTab(s as any)}
                                        className={`px-3 py-1.5 rounded-xl text-[11px] lg:text-xs font-bold uppercase tracking-wider transition-all ${hfSubTab === s ? 'bg-amber-500 text-stone-950 shadow-sm' : 'text-stone-400 hover:text-stone-200'}`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>

                            <div className="hidden lg:block w-px h-6 bg-stone-800 mx-1"></div>

                            <div className="flex gap-1 p-1 overflow-x-auto no-scrollbar whitespace-nowrap border-t lg:border-t-0 border-stone-800 pt-2 lg:pt-1">
                                {[
                                    { id: 'youtube', label: 'YouTube' },
                                    { id: 'bytedance', label: 'ByteDance' },
                                    { id: 'bair', label: 'BAIR' },
                                    { id: 'google_research', label: 'Google' }
                                ].map((s) => (
                                    <button
                                        key={s.id}
                                        onClick={() => setHfSubTab(s.id as any)}
                                        className={`px-3 py-1.5 rounded-xl text-[11px] lg:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${hfSubTab === s.id ? 'bg-blue-600 text-white shadow-sm' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'}`}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>

                            {/* Date Picker (Only for Daily) */}
                            {hfSubTab === 'daily' && (
                                <div className="flex items-center justify-between lg:justify-end gap-2 px-2 py-2 lg:py-0 lg:ml-auto border-t lg:border-t-0 lg:border-l border-stone-800">
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => {
                                            const d = new Date(selectedDate);
                                            d.setDate(d.getDate() - 1);
                                            setSelectedDate(d.toISOString().split('T')[0]);
                                        }} className="p-1.5 hover:bg-stone-800 rounded-lg text-stone-400"><ChevronLeft size={16} /></button>

                                        <input
                                            type="date"
                                            value={selectedDate}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                            className="bg-stone-950 border border-stone-800 rounded-lg px-2 py-1 text-stone-200 text-[11px] font-bold focus:outline-none focus:border-stone-600 appearance-none"
                                        />

                                        <button onClick={() => {
                                            const d = new Date(selectedDate);
                                            d.setDate(d.getDate() + 1);
                                            setSelectedDate(d.toISOString().split('T')[0]);
                                        }} className="p-1.5 hover:bg-stone-800 rounded-lg text-stone-400"><ChevronRight size={16} /></button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {loadingTrending ? (
                            <div className="flex justify-center p-10"><Loader2 className="animate-spin text-stone-500" size={32} /></div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {trendingPapers.length === 0 ? <p className="col-span-2 text-center text-stone-500 py-10">No papers found for this selection.</p> : null}
                                {trendingPapers.map((p, idx) => (
                                    <div key={idx} className="bg-stone-900 rounded-xl border border-stone-800 overflow-hidden flex flex-col hover:border-amber-900/30 transition-all shadow-sm group">
                                        {/* Header Image Placeholder or Abstract Highlight could go here */}
                                        <div className="p-5 flex flex-col h-full">
                                            <h3 className="font-bold text-lg text-stone-100 leading-tight mb-2 line-clamp-2">{p.title}</h3>
                                            <p className="text-stone-500 text-sm mb-4 line-clamp-1">{p.authors}</p>

                                            {/* Abstract / TLDR Area */}
                                            <div className="flex-1 mb-4">
                                                {analysisResults[p.id || p.link] ? (
                                                    <div className="bg-amber-900/10 border border-amber-900/20 p-3 rounded-lg text-sm text-stone-300 animate-in fade-in zoom-in-95 duration-300">
                                                        <span className="text-amber-500 font-bold block mb-1 flex items-center gap-1"><Sparkles size={12} /> TLDR</span>
                                                        {analysisResults[p.id || p.link]}
                                                    </div>
                                                ) : (
                                                    <p className="text-stone-400 text-sm line-clamp-4 leading-relaxed">{p.abstract}</p>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-3 mt-auto pt-4 border-t border-stone-800/50">
                                                {p.pdf && (
                                                    <a href={p.pdf} target="_blank" className="flex items-center gap-1.5 text-xs font-medium text-stone-400 hover:text-stone-200 transition-colors">
                                                        <FileText size={14} /> PDF
                                                    </a>
                                                )}

                                                <div className="ml-auto flex gap-2">
                                                    {!analysisResults[p.id || p.link] && (
                                                        <button
                                                            onClick={() => handleAnalyze(p)}
                                                            disabled={analyzing[p.id || p.link]}
                                                            className="bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors"
                                                        >
                                                            {analyzing[p.id || p.link] ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                                            Analyze
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => handleAddToLibrary(p)}
                                                        disabled={actionStates[p.id || p.link] === 'loading' || actionStates[p.id || p.link] === 'success'}
                                                        className={`text-xs px-4 py-1.5 rounded-full font-medium transition-colors flex items-center gap-1.5
                                                            ${actionStates[p.id || p.link] === 'success'
                                                                ? 'bg-green-900/20 text-green-400 border border-green-500/20'
                                                                : 'bg-stone-100 text-stone-900 hover:bg-white'}`}
                                                    >
                                                        {actionStates[p.id || p.link] === 'loading' ? <Loader2 size={12} className="animate-spin" /> : <Plus size={14} />}
                                                        {actionStates[p.id || p.link] === 'success' ? 'Added' : 'Add'}
                                                    </button>
                                                    <button onClick={() => handleRelatedSearch(p)} className="bg-stone-800 hover:bg-stone-700 text-stone-400 p-1.5 rounded-full transition-colors" title="Find Related">
                                                        <Search size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {hasMore && hfSubTab === 'trending' && (
                            <div className="flex justify-center mt-8">
                                <button onClick={() => fetchTrending(true)} disabled={loadingMore} className="bg-stone-800 text-stone-300 px-6 py-2 rounded-full hover:bg-stone-700 transition-colors flex items-center gap-2 text-sm">{loadingMore ? <Loader2 className="animate-spin" size={16} /> : 'Load More'}</button>
                            </div>
                        )}
                    </div>
                )}

                {/* AI SEARCH TAB */}
                {activeTab === 'ai_search' && (
                    <div className="space-y-4 lg:space-y-6">
                        {/* Sub Tabs */}
                        <div className="flex gap-1 p-1 bg-stone-900 border border-stone-800 rounded-2xl w-full lg:w-fit overflow-x-auto no-scrollbar">
                            {[
                                { id: 'conference', label: 'Conference' },
                                { id: 'keyword', label: 'Topic' },
                                { id: 'arxiv', label: 'Arxiv' }
                            ].map((mode) => (
                                <button
                                    key={mode.id}
                                    onClick={() => { setAiSearchMode(mode.id as any); setAiResults([]); }}
                                    className={`flex-1 lg:flex-none px-4 py-2 rounded-xl text-[11px] lg:text-sm font-bold uppercase tracking-wider transition-all whitespace-nowrap ${aiSearchMode === mode.id ? 'bg-amber-500 text-stone-950 shadow-sm' : 'text-stone-400 hover:text-stone-200'}`}
                                >
                                    {mode.label}
                                </button>
                            ))}
                        </div>

                        {/* Controls */}
                        <div className="flex flex-col lg:flex-row gap-2 lg:gap-4 bg-stone-900/50 p-2 lg:p-4 rounded-2xl border border-stone-800">
                            {aiSearchMode === 'conference' && (
                                <div className="flex flex-col lg:flex-row gap-2 flex-1">
                                    <input
                                        value={aiConferenceName}
                                        onChange={e => setAiConferenceName(e.target.value)}
                                        placeholder="Conference (e.g. ACL 2025)..."
                                        className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-sm"
                                    />
                                    <button onClick={handleAiSearch} disabled={!aiConferenceName} className="bg-amber-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-amber-500 disabled:opacity-50 text-sm shadow-lg shadow-amber-900/20 active:scale-95 transition-all">
                                        Scrape Top Papers
                                    </button>
                                </div>
                            )}

                            {aiSearchMode === 'keyword' && (
                                <div className="flex flex-col lg:flex-row gap-2 flex-1">
                                    <input
                                        value={aiQuery}
                                        onChange={e => setAiQuery(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAiSearch()}
                                        placeholder="Topic (e.g. LLM Reasoning)..."
                                        className="flex-[2] bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-sm"
                                    />
                                    <div className="flex items-center gap-2 bg-stone-950 border border-stone-800 rounded-xl px-3 group focus-within:ring-2 focus-within:ring-amber-500/50">
                                        <span className="text-stone-600 text-[10px] font-black uppercase tracking-tighter whitespace-nowrap">Since</span>
                                        <input
                                            type="date"
                                            value={aiDateMargin}
                                            onChange={e => setAiDateMargin(e.target.value)}
                                            className="bg-transparent text-stone-300 text-[12px] focus:outline-none py-3 font-bold"
                                        />
                                    </div>
                                    <button onClick={handleAiSearch} disabled={!aiQuery} className="bg-amber-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-amber-500 disabled:opacity-50 text-sm shadow-lg shadow-amber-900/20 active:scale-95 transition-all">
                                        Find Papers
                                    </button>
                                </div>
                            )}

                            {aiSearchMode === 'arxiv' && (
                                <div className="flex flex-col lg:flex-row gap-2 flex-1">
                                    <input
                                        value={aiQuery}
                                        onChange={e => setAiQuery(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAiSearch()}
                                        placeholder="Search Arxiv..."
                                        className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-sm"
                                    />
                                    <button onClick={handleAiSearch} className="bg-stone-100 text-stone-950 px-6 py-3 rounded-xl font-bold hover:bg-white flex items-center justify-center gap-2 text-sm active:scale-95 transition-all">
                                        <Search size={16} /> Search
                                    </button>
                                </div>
                            )}
                        </div>

                        {loadingAi ? (
                            <div className="flex flex-col items-center justify-center p-20 gap-4">
                                <Loader2 className="animate-spin text-amber-500" size={40} />
                                <p className="text-stone-500 animate-pulse">Agent is searching & analysing...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {aiResults.map((p, idx) => (
                                    <div key={idx} className="bg-stone-900 p-5 rounded-xl border border-stone-800 shadow-sm flex flex-col gap-3 hover:border-amber-900/40 transition-colors group">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-lg text-stone-100 group-hover:text-amber-500 transition-colors">{p.title}</h3>
                                                <p className="text-stone-500 text-sm mt-1">{p.authors} • {p.published?.split('T')[0]}</p>
                                            </div>
                                            {p.source && <span className="text-xs bg-stone-800 px-2 py-1 rounded text-stone-400 border border-stone-700">{p.source}</span>}
                                        </div>

                                        <div className="bg-stone-950/50 p-4 rounded-xl text-stone-300 text-sm leading-relaxed border border-stone-800/50 prose prose-invert prose-sm max-w-none prose-img:rounded-xl">
                                            <ReactMarkdown
                                                components={{
                                                    img: ({ node, ...props }) => <img {...props} className="max-w-full h-auto rounded-xl my-4 mx-auto" />
                                                }}
                                            >
                                                {p.summary || p.abstract}
                                            </ReactMarkdown>
                                        </div>

                                        <div className="flex items-center gap-3 pt-2">
                                            <button
                                                onClick={() => handleAddToLibrary({ ...p, tldr_kr: p.summary, memo: p.summary })}
                                                disabled={actionStates[p.id || p.link] === 'loading' || actionStates[p.id || p.link] === 'success'}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors
                                                ${actionStates[p.id || p.link] === 'success' ? 'bg-green-900/20 text-green-400 border border-green-500/20' : 'bg-stone-100 text-stone-900 hover:bg-white'}`}
                                            >
                                                {actionStates[p.id || p.link] === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={16} />}
                                                {actionStates[p.id || p.link] === 'success' ? 'Added to Library' : 'Add to Library'}
                                            </button>
                                            <button onClick={() => handleRelatedSearch(p)} className="px-4 py-2 rounded-lg text-sm font-medium bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white transition-colors flex items-center gap-2">
                                                <Search size={14} /> Find Related
                                            </button>
                                            {p.link && <a href={p.link} target="_blank" className="ml-auto text-stone-500 hover:text-blue-400 flex items-center gap-1 text-sm"><ExternalLink size={14} /> Source</a>}
                                            {p.pdf && <a href={p.pdf} target="_blank" className="text-stone-500 hover:text-red-400 flex items-center gap-1 text-sm"><FileText size={14} /> PDF</a>}
                                        </div>
                                    </div>
                                ))}
                                {aiResults.length === 0 && !loadingAi && (
                                    <div className="text-center py-20 text-stone-500 border border-dashed border-stone-800 rounded-xl">
                                        No papers found. Try adjusting your search.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modals remain the same */}
            {manualAddModal && (
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
            )}
            {editingPaper && (
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
                                    onClick={async () => {
                                        const success = await deletePaper(editingPaper.id);
                                        if (success) setEditingPaper(null);
                                    }}
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
            )}
        </div>
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
