'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { Loader2, ExternalLink, RefreshCw, Bookmark, Share2, MessageCircle, Heart, Repeat, Flame, Layers } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';

interface TweetCard {
    id: string;
    title: string;
    authors: string;
    link: string;
    memo: string;
    tags: string[];
    created_at: string;
}

export default function XFeedPage() {
    const [tweets, setTweets] = useState<TweetCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchTweets();
    }, []);

    const fetchTweets = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('papers')
            .select('*')
            .contains('tags', ['X'])
            .order('created_at', { ascending: false })
            .limit(50);

        if (data) setTweets(data);
        setLoading(false);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await fetch('/api/scholar-inbox', { method: 'POST' });
            await fetchTweets();
        } catch (e) {
            console.error("Refresh failed", e);
            alert("Failed to refresh feed.");
        } finally {
            setRefreshing(false);
        }
    };

    const handleSaveToLibrary = async (id: string, currentTags: string[]) => {
        // Remove 'Scholar Inbox' to "save" it to the permanent library
        const newTags = currentTags.filter(t => t !== 'Scholar Inbox');

        // If it essentially hasn't changed (meaning it wasn't in inbox or already saved), 
        // we might strictly want to ensure it is considered "saved".
        // In our logic, simply having 'X' and NOT 'Scholar Inbox' makes it visible in My Papers.

        if (currentTags.length === newTags.length && !currentTags.includes('Scholar Inbox')) {
            return; // Already saved
        }

        const { error } = await supabase.from('papers').update({
            tags: newTags,
            status: 'unread' // Mark as unread so user notices it in their library
        }).eq('id', id);

        if (!error) {
            setTweets(tweets.map(t => t.id === id ? { ...t, tags: newTags } : t));
        }
    };

    // Parser for the specific format user provided
    const parseMemo = (memo: string) => {
        // Default values
        let tldr = '';
        let relation = '';
        let cleanMemo = memo;

        // Try to extract TL;DR
        const tldrMatch = memo.match(/(?:TL;?DR|Summary):\s*(.*?)(?=(?:\n|$|Relation:))/is);
        if (tldrMatch) {
            tldr = tldrMatch[1].trim();
        }

        // Try to extract Relation
        const relationMatch = memo.match(/Relation:\s*(.*?)(?=(?:\n|$|\(Source:))/is);
        if (relationMatch) {
            relation = relationMatch[1].trim();
        }

        // If we found structured data, we might want to use that.
        // If not, we fall back to displaying the whole memo.
        const hasStructure = tldr || relation;

        return { tldr, relation, hasStructure };
    };

    return (
        <div className="max-w-3xl mx-auto pb-24 lg:pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 lg:mb-10 gap-4 px-1 lg:px-0">
                <div className="flex items-center gap-3">
                    <span className="bg-stone-800 text-white p-2 rounded-xl border border-stone-700 shrink-0">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" className="lg:w-7 lg:h-7"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                    </span>
                    <h1 className="text-2xl lg:text-4xl font-extrabold text-white tracking-tight">
                        X Feed
                    </h1>
                </div>
                <div className="flex gap-2 w-full lg:w-auto overflow-x-auto no-scrollbar pb-1">
                    <Link
                        href="/private/x/library"
                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-stone-900/50 text-stone-200 rounded-xl hover:bg-stone-800 border border-stone-800 transition-all font-bold text-xs lg:text-sm whitespace-nowrap"
                    >
                        <Bookmark size={16} />
                        Library
                    </Link>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-stone-950 rounded-xl hover:bg-amber-400 disabled:opacity-50 transition-all font-bold text-xs lg:text-sm whitespace-nowrap shadow-lg shadow-amber-900/10"
                    >
                        <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                        {refreshing ? "Syncing..." : "Sync Feed"}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="animate-spin text-stone-500 mb-4" size={40} />
                    <p className="text-stone-500 font-medium">Fetching latent space signals...</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {tweets.length === 0 ? (
                        <div className="text-center py-24 bg-stone-900/50 rounded-2xl border border-dashed border-stone-800">
                            <p className="text-stone-400 font-medium text-lg">No viral threads currently.</p>
                            <p className="text-stone-500 text-sm mt-1">Tap 'Sync Feed' to run the agent.</p>
                        </div>
                    ) : (
                        tweets.map(tweet => {
                            const isAdded = !tweet.tags?.includes('Scholar Inbox');
                            const { tldr, relation, hasStructure } = parseMemo(tweet.memo);

                            // Detect tags from memo or explicit tags (if we had them in a separate column, but we'll use regex on memo or title if needed)
                            const isViral = tweet.tags?.includes('Viral') || tweet.memo.toLowerCase().includes('viral');
                            const isThread = tweet.tags?.includes('Thread') || tweet.memo.toLowerCase().includes('thread');

                            return (
                                <div key={tweet.id} className="group relative bg-stone-900 rounded-3xl border border-stone-810 shadow-sm hover:border-stone-700 transition-all duration-300 overflow-hidden">
                                    {/* Card Header / Author Info */}
                                    <div className="p-4 lg:p-8 pb-3 lg:pb-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3 mb-3 lg:mb-4">
                                                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center text-lg font-bold text-stone-400 shrink-0">
                                                    {tweet.authors ? tweet.authors[0].toUpperCase() : 'A'}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-bold text-stone-100 text-base lg:text-lg leading-tight line-clamp-1">{tweet.authors || "Unknown Author"}</span>
                                                    <span className="text-stone-500 text-xs mt-0.5">@{tweet.authors?.split(' ')[0]?.toLowerCase() || 'handle'}</span>
                                                </div>
                                            </div>
                                            <a
                                                href={tweet.link}
                                                target="_blank"
                                                className="text-stone-600 hover:text-amber-500 transition-colors p-2"
                                            >
                                                <ExternalLink size={20} className="lg:w-6 lg:h-6" />
                                            </a>
                                        </div>

                                        <h2 className="text-lg lg:text-2xl font-bold text-stone-100 mb-2 leading-snug group-hover:text-amber-500 transition-colors">
                                            {tweet.title}
                                        </h2>
                                    </div>

                                    {/* Card Body */}
                                    <div className="px-4 lg:px-8 pb-4 lg:pb-6">
                                        <div className="bg-stone-950/60 rounded-2xl p-4 lg:p-6 space-y-4 border border-stone-800/50">
                                            {hasStructure ? (
                                                <>
                                                    {tldr && (
                                                        <div>
                                                            <div className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">TL;DR</div>
                                                            <p className="text-stone-300 font-medium leading-relaxed">{tldr}</p>
                                                        </div>
                                                    )}
                                                    {relation && (
                                                        <div className="pt-2 border-t border-stone-800">
                                                            <div className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Relation</div>
                                                            <p className="text-stone-400 leading-relaxed">{relation}</p>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="prose prose-sm prose-invert max-w-none text-stone-300">
                                                    <ReactMarkdown>{tweet.memo}</ReactMarkdown>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Footer / Actions */}
                                    <div className="px-4 lg:px-8 pb-4 lg:pb-6 flex flex-col lg:flex-row justify-between items-center gap-4">
                                        {/* Badges */}
                                        <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto no-scrollbar pb-1 lg:pb-0">
                                            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-900/20 text-blue-300 text-[11px] font-bold whitespace-nowrap border border-blue-510/10 uppercase tracking-tight">
                                                <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                                                Source: X
                                            </span>
                                            {isViral && (
                                                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-900/20 text-pink-300 text-[11px] font-bold whitespace-nowrap border border-pink-510/10 uppercase tracking-tight">
                                                    <Flame size={12} /> Viral
                                                </span>
                                            )}
                                            {isThread && (
                                                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-900/20 text-purple-300 text-[11px] font-bold whitespace-nowrap border border-purple-510/10 uppercase tracking-tight">
                                                    <Layers size={12} /> Thread
                                                </span>
                                            )}
                                        </div>

                                        {/* Save Button */}
                                        <button
                                            onClick={() => handleSaveToLibrary(tweet.id, tweet.tags)}
                                            disabled={isAdded}
                                            className={`
                                                relative w-full lg:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black text-xs lg:text-sm transition-all uppercase tracking-widest
                                                ${isAdded
                                                    ? 'bg-stone-800 text-stone-500 border border-stone-700 cursor-default opacity-50'
                                                    : 'bg-stone-100 text-stone-900 hover:bg-white hover:scale-105 shadow-xl shadow-amber-500/5'
                                                }
                                            `}
                                        >
                                            {isAdded ? (
                                                <>
                                                    <Bookmark size={14} fill="currentColor" />
                                                    Saved
                                                </>
                                            ) : (
                                                <>
                                                    <Bookmark size={14} />
                                                    Save to Library
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}
