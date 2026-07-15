'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { Loader2, ExternalLink, ArrowLeft, Layers, Flame, Trash2, BookDown } from 'lucide-react';
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

export default function XLibraryPage() {
    const [tweets, setTweets] = useState<TweetCard[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLibrary();
    }, []);

    const fetchLibrary = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('papers')
            .select('*')
            .contains('tags', ['X'])
            .order('created_at', { ascending: false });

        if (data) {
            // Filter out inbox items, keep only saved
            const saved = data.filter(t => !t.tags?.includes('Scholar Inbox'));
            setTweets(saved);
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Remove from library?')) return;

        // We probably just want to delete the paper or mark it? 
        // If we delete:
        const { error } = await supabase.from('papers').delete().eq('id', id);
        if (!error) {
            setTweets(tweets.filter(t => t.id !== id));
        }
    };

    const handleMoveToPapers = async (id: string, tags: string[]) => {
        if (!confirm('Move to main paper list?')) return;

        // Remove 'X' from tags
        const newTags = tags.filter(t => t !== 'X');

        const { error } = await supabase.from('papers').update({ tags: newTags }).eq('id', id);

        if (!error) {
            // Remove from current view as it no longer has 'X' tag
            setTweets(tweets.filter(t => t.id !== id));
        }
    };

    const parseMemo = (memo: string) => {
        let tldr = '';
        let relation = '';
        let cleanMemo = memo;

        const tldrMatch = memo.match(/(?:TL;?DR|Summary):\s*(.*?)(?=(?:\n|$|Relation:))/is);
        if (tldrMatch) tldr = tldrMatch[1].trim();

        const relationMatch = memo.match(/Relation:\s*(.*?)(?=(?:\n|$|\(Source:))/is);
        if (relationMatch) relation = relationMatch[1].trim();

        const hasStructure = tldr || relation;
        return { tldr, relation, hasStructure };
    };

    return (
        <div className="max-w-6xl mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-10 gap-4">
                <div>
                    <Link href="/private/x" className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-300 mb-4 transition-colors">
                        <ArrowLeft size={20} /> Back to Feed
                    </Link>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight">
                        X Library
                    </h1>
                    <p className="text-stone-400 mt-2 font-medium">Your collection of saved threads and discussions.</p>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="animate-spin text-stone-500 mb-4" size={40} />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tweets.length === 0 ? (
                        <div className="col-span-full text-center py-24 bg-stone-900/50 rounded-2xl border border-dashed border-stone-800">
                            <p className="text-stone-400 font-medium text-lg">Your library is empty.</p>
                            <p className="text-stone-500 text-sm mt-1">Save threads from the X Feed to see them here.</p>
                        </div>
                    ) : (
                        tweets.map(tweet => {
                            const { tldr, hasStructure } = parseMemo(tweet.memo);
                            const isViral = tweet.tags?.includes('Viral');
                            const isThread = tweet.tags?.includes('Thread');

                            return (
                                <div key={tweet.id} className="group flex flex-col bg-stone-900 rounded-2xl border border-stone-800 shadow-sm hover:shadow-xl hover:border-stone-700 transition-all duration-300 overflow-hidden">
                                    <div className="p-6 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center text-lg font-bold text-stone-400">
                                                    {tweet.authors ? tweet.authors[0].toUpperCase() : 'A'}
                                                </div>
                                                <div className="flex flex-col overflow-hidden">
                                                    <span className="font-bold text-stone-100 text-sm leading-tight truncate max-w-[120px]">{tweet.authors || "Unknown"}</span>
                                                    <span className="text-stone-500 text-xs">@{tweet.authors?.split(' ')[0]?.toLowerCase()}</span>
                                                </div>
                                            </div>
                                            <a href={tweet.link} target="_blank" className="text-stone-600 hover:text-amber-500 transition-colors">
                                                <ExternalLink size={18} />
                                            </a>
                                        </div>

                                        <h2 className="text-lg font-bold text-stone-100 mb-3 leading-snug group-hover:text-amber-500 transition-colors line-clamp-3">
                                            {tweet.title}
                                        </h2>

                                        <div className="mt-auto pt-4 space-y-3">
                                            {hasStructure && tldr ? (
                                                <p className="text-stone-400 text-sm line-clamp-4 leading-relaxed">{tldr}</p>
                                            ) : (
                                                <div className="text-stone-400 text-sm line-clamp-4 prose prose-invert prose-sm">
                                                    <ReactMarkdown>{tweet.memo}</ReactMarkdown>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="px-6 py-4 bg-stone-950/30 border-t border-stone-800 flex justify-between items-center">
                                        <div className="flex gap-2">
                                            {isViral && <Flame size={14} className="text-pink-400" />}
                                            {isThread && <Layers size={14} className="text-purple-400" />}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleMoveToPapers(tweet.id, tweet.tags)}
                                                className="text-stone-600 hover:text-blue-400 transition-colors flex items-center gap-1 text-xs"
                                                title="Move to Main Papers"
                                            >
                                                <BookDown size={16} /> Move to Papers
                                            </button>
                                            <button
                                                onClick={() => handleDelete(tweet.id)}
                                                className="text-stone-600 hover:text-red-400 transition-colors"
                                                title="Remove from library"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
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
