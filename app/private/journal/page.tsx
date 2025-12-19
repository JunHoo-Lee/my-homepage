'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import RichTextEditor from '@/app/components/RichTextEditor';
import JournalEntry from '@/app/private/journal/JournalEntry';
import { groupEntriesByDate, formatHeaderDate } from '@/app/lib/journal/utils';
import { PenLine } from 'lucide-react';

export default function JournalPage() {
    const [entries, setEntries] = useState<any[]>([]);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchJournal();
    }, []);

    const fetchJournal = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('journal').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error('Error fetching journal:', error);
        }
        setEntries(data || []);
        setLoading(false);
    };

    const handleSubmit = async () => {
        if (!content.trim() || submitting) return;
        setSubmitting(true);

        const { error: insertError } = await supabase.from('journal').insert([{
            id: crypto.randomUUID(),
            content,
            created_at: new Date().toISOString()
        }]);
        if (!insertError) {
            setContent('');
            await fetchJournal(); // Refresh list to show new entry at top
        } else {
            console.error(insertError);
            alert(`Failed to post entry: ${insertError.message || JSON.stringify(insertError)}`);
        }
        setSubmitting(false);
    };

    const groupedEntries = groupEntriesByDate(entries);
    // Sort dates descending (Newest first)
    const sortedDates = Object.keys(groupedEntries).sort((a, b) => b.localeCompare(a));

    return (
        <div className="max-w-3xl mx-auto min-h-screen pb-32">

            {/* Header Area */}
            <div className="pt-8 pb-6 px-4">
                <h1 className="text-2xl font-bold text-stone-100 mb-1">Stream</h1>
                <p className="text-stone-500 text-sm">Dump your thoughts, rolling notes, and ideas.</p>
            </div>

            {/* Input Wrapper - Not strictly sticky to avoid eating too much space on mobile, 
                but distinct enough to feel like a "Input Console" */}
            <div className="mb-12 px-4">
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/10 to-orange-600/10 rounded-xl opacity-0 group-hover:opacity-100 transition duration-500 blur-lg"></div>
                    <div className="relative z-10">
                        <RichTextEditor
                            value={content}
                            onChange={setContent}
                            onSubmit={handleSubmit}
                            placeholder="What's on your mind? (⌘+Enter to post)"
                            minHeight="120px"
                            className="border-stone-800/80 bg-stone-900/80 backdrop-blur"
                        />
                    </div>
                </div>
            </div>

            {/* Timeline Stream */}
            <div className="relative px-4">
                {/* Continuous Vertical Line */}
                <div className="absolute left-[27px] top-0 bottom-0 w-px bg-stone-800/50 hidden sm:block"></div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-6 h-6 border-2 border-stone-800 border-t-amber-500 rounded-full animate-spin"></div>
                    </div>
                ) : entries.length === 0 ? (
                    <div className="text-center py-20 pl-8">
                        <p className="text-stone-600 text-sm">The stream is empty. Write something above.</p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {sortedDates.map(dateKey => (
                            <div key={dateKey} className="relative z-10">
                                {/* Date Header */}
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="hidden sm:flex items-center justify-center w-6 h-6 rounded-full bg-stone-900 border border-stone-700 text-stone-500 shadow-sm shrink-0 -ml-[3px]">
                                        <div className="w-2 h-2 rounded-full bg-stone-600"></div>
                                    </div>
                                    <h2 className="text-stone-400 font-medium text-sm tracking-wide bg-stone-950/90 px-2 py-1 rounded sticky top-0 backdrop-blur z-20 inline-block border border-stone-900">
                                        {formatHeaderDate(dateKey)}
                                    </h2>
                                </div>

                                {/* Entries List for this Date */}
                                <div className="space-y-2 sm:pl-8">
                                    {groupedEntries[dateKey].map(entry => (
                                        <JournalEntry
                                            key={entry.id}
                                            content={entry.content}
                                            createdAt={entry.created_at}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

