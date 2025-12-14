'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { Loader2, ExternalLink, RefreshCw, MessageCircle, Heart, Repeat } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function XFeedPage() {
    const [tweets, setTweets] = useState<any[]>([]);
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
            .contains('tags', ['X']) // Fetch only X content
            .order('created_at', { ascending: false })
            .limit(50);

        if (data) setTweets(data);
        setLoading(false);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        // Trigger the agent search specifically for X
        try {
            const res = await fetch('/api/scholar-inbox', {
                method: 'POST',
                // We might want to pass a param to force X search, but the current agent does both.
                // For now, just calling it will refresh the inbox.
            });
            await res.json();
            // Re-fetch from DB
            await fetchTweets();
        } catch (e) {
            console.error("Refresh failed", e);
            alert("Failed to refresh feed.");
        } finally {
            setRefreshing(false);
        }
    };

    // Helper to format "faves/RTs" if we had them (Currently we don't store them explicitly but we might parse them)
    // For now, just visual placeholder or if memo contains stats.

    const handleRead = async (id: string, currentTags: string[]) => {
        // "Mark as Read" or "Add to Library" - effectively removing 'Scholar Inbox' if present
        // If it's just a feed, maybe we just want to keep it there?
        // User said "Add to reading list".
        // Let's allow adding.

        const newTags = currentTags.filter(t => t !== 'Scholar Inbox');
        // Check if already added
        if (currentTags.length === newTags.length && !currentTags.includes('Scholar Inbox')) {
            // Already "in library"
            return;
        }

        const { error } = await supabase.from('papers').update({
            tags: newTags,
            status: 'unread'
        }).eq('id', id);

        if (!error) {
            // Update local state
            setTweets(tweets.map(t => t.id === id ? { ...t, tags: newTags } : t));
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <span className="bg-black text-white p-2 rounded-lg"><svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l11.733 16h4.267l-11.733 -16z" /><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" /></svg></span>
                        Viral AI Feed
                    </h1>
                    <p className="text-gray-500 mt-2">Latest viral threads & discussions from X (Twitter) about AI.</p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-all disabled:opacity-50"
                >
                    <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                    {refreshing ? "Checking X..." : "Refresh Feed"}
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-20">
                    <Loader2 className="animate-spin text-gray-400" size={40} />
                </div>
            ) : (
                <div className="space-y-6">
                    {tweets.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">
                            No viral threads found yet. Click "Refresh Feed" to start the agent.
                        </div>
                    ) : (
                        <div className="grid gap-6">
                            {tweets.map(tweet => {
                                const isAdded = !tweet.tags?.includes('Scholar Inbox');

                                return (
                                    <div key={tweet.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                        <div className="p-6">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="font-bold text-xl text-gray-900 leading-snug mb-1">{tweet.title}</h3>
                                                    <p className="text-gray-500 text-sm">{tweet.authors}</p>
                                                </div>
                                                <a
                                                    href={tweet.link}
                                                    target="_blank"
                                                    className="text-gray-400 hover:text-blue-500 p-2 hover:bg-blue-50 rounded-full transition-colors"
                                                >
                                                    <ExternalLink size={20} />
                                                </a>
                                            </div>

                                            <div className="prose prose-sm max-w-none text-gray-700 bg-gray-50 p-4 rounded-lg">
                                                <ReactMarkdown>{tweet.memo}</ReactMarkdown>
                                            </div>

                                            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                                                <div className="flex items-center gap-4 text-gray-400 text-sm">
                                                    {/* Placeholder stats or real if we had them */}
                                                    <div className="flex items-center gap-1"><Heart size={16} /> Viral</div>
                                                    <div className="flex items-center gap-1"><Repeat size={16} /> Thread</div>
                                                </div>

                                                <button
                                                    onClick={() => handleRead(tweet.id, tweet.tags)}
                                                    disabled={isAdded}
                                                    className={`px-6 py-2 rounded-full font-medium text-sm transition-all ${isAdded
                                                            ? 'bg-green-50 text-green-600 border border-green-200 cursor-default'
                                                            : 'bg-black text-white hover:bg-gray-800 shadow-lg shadow-gray-200'
                                                        }`}
                                                >
                                                    {isAdded ? "Saved to Library" : "Add to Library"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
