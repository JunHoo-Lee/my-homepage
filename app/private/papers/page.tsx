'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { Plus, Loader2, Sparkles, BookOpen, ExternalLink, RefreshCw } from 'lucide-react';

export default function PapersPage() {
    const [activeTab, setActiveTab] = useState<'my_papers' | 'trending' | 'for_you'>('my_papers');

    // Data States
    const [myPapers, setMyPapers] = useState<any[]>([]);
    const [trendingPapers, setTrendingPapers] = useState<any[]>([]);
    const [recommendedPapers, setRecommendedPapers] = useState<any[]>([]);

    // Loading States
    const [loadingMyParams, setLoadingMyParams] = useState(true);
    const [loadingTrending, setLoadingTrending] = useState(false); // Lazy load
    const [loadingForYou, setLoadingForYou] = useState(false); // Lazy load

    // Input State
    const [input, setInput] = useState('');
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        fetchMyPapers();
    }, []);

    const fetchMyPapers = async () => {
        setLoadingMyParams(true);
        const { data } = await supabase.from('papers').select('*').order('created_at', { ascending: false });
        setMyPapers(data || []);
        setLoadingMyParams(false);
    };

    const fetchTrending = async () => {
        if (trendingPapers.length > 0) return; // already fetched
        setLoadingTrending(true);
        try {
            const res = await fetch('/api/fetch-trending', {
                method: 'POST',
                body: JSON.stringify({ source: 'huggingface', count: 10 })
            });
            const data = await res.json();
            setTrendingPapers(data.papers || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingTrending(false);
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
                    body: JSON.stringify({ source: 'huggingface', count: 15 })
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
        // If manually adding, paper is parsed from input.
        // If from Trending/For You, paper object is passed.

        const newPaper = {
            title: paper.title,
            authors: paper.authors,
            link: paper.link,
            tags: paper.tags || [], // Trending papers might not have tags initially unless we AI parse them too, avoiding for now to save tokens
            status: 'unread',
            memo: paper.tldr_kr // Store TLDR in memo? Or maybe separate field? Schema has memo. Let's use memo for now.
        };

        const { error } = await supabase.from('papers').insert([newPaper]);
        if (!error) {
            alert('Added to library!');
            fetchMyPapers(); // Refresh my papers
        } else {
            alert('Failed to add');
        }
    };

    const handleManualAdd = async (e: React.FormEvent) => {
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
        } finally {
            setAdding(false);
        }
    };

    return (
        <div className="space-y-6">
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
                        {/* Manual Add */}
                        <form onSubmit={handleManualAdd} className="flex gap-4">
                            <input
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder="Add paper by link or citation..."
                                className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={adding}
                            />
                            <button
                                type="submit"
                                disabled={adding}
                                className="bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-800 disabled:opacity-50"
                            >
                                {adding ? <Loader2 className="animate-spin" /> : <Plus />}
                            </button>
                        </form>

                        {loadingMyParams ? <p>Loading...</p> : (
                            <div className="grid gap-4">
                                {myPapers.map(p => (
                                    <div key={p.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex justify-between items-start">
                                        <div>
                                            <h3 className="font-semibold text-lg text-gray-900">{p.title}</h3>
                                            <p className="text-gray-600 text-sm mt-1">{p.authors}</p>
                                            <div className="flex gap-2 mt-2">
                                                <span className={`px-2 py-1 rounded text-xs ${p.status === 'read' ? 'bg-green-100 text-green-700' :
                                                        p.status === 'reading' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {p.status}
                                                </span>
                                                {p.tags?.map((t: string) => (
                                                    <span key={t} className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-500">#{t}</span>
                                                ))}
                                            </div>
                                        </div>
                                        {p.link && (
                                            <a href={p.link} target="_blank" className="text-gray-400 hover:text-blue-600">
                                                <ExternalLink size={20} />
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'trending' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <p className="text-sm text-gray-500">Source: HuggingFace Daily Papers</p>
                            <button onClick={() => { setTrendingPapers([]); fetchTrending(); }} className="text-sm text-blue-600 flex items-center gap-1">
                                <RefreshCw size={14} /> Refresh
                            </button>
                        </div>

                        {loadingTrending ? (
                            <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-600" size={32} /></div>
                        ) : (
                            <div className="grid gap-4">
                                {trendingPapers.map((p, idx) => (
                                    <div key={idx} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-semibold text-lg text-gray-900">{p.title}</h3>
                                            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">HF</span>
                                        </div>
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
        </div>
    );
}
