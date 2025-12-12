'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import Link from 'next/link';
import { Link2 } from 'lucide-react';

interface BacklinksProps {
    currentId?: string;
    currentTitle: string;
}

interface LinkItem {
    id: string;
    title: string;
    type: 'note' | 'paper' | 'journal';
    snippet: string;
    updated_at: string;
}

export default function Backlinks({ currentId, currentTitle }: BacklinksProps) {
    const [links, setLinks] = useState<LinkItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (currentTitle) {
            findBacklinks();
        }
    }, [currentTitle, currentId]);

    const findBacklinks = async () => {
        setLoading(true);
        const searchPattern = `[[${currentTitle}]]`;
        const foundLinks: LinkItem[] = [];

        try {
            // 1. Search Notes
            const { data: notes } = await supabase
                .from('notes')
                .select('id, title, content, updated_at')
                .ilike('content', `%${searchPattern}%`);

            if (notes) {
                notes.forEach(n => {
                    if (n.id !== currentId) { // Exclude self
                        foundLinks.push({
                            id: n.id,
                            title: n.title,
                            type: 'note',
                            snippet: getSnippet(n.content, searchPattern),
                            updated_at: n.updated_at
                        });
                    }
                });
            }

            // 2. Search Papers (Memo)
            const { data: papers } = await supabase
                .from('papers')
                .select('id, title, memo, created_at')
                .ilike('memo', `%${searchPattern}%`);

            if (papers) {
                papers.forEach(p => {
                    if (p.id !== currentId) {
                        foundLinks.push({
                            id: p.id,
                            title: p.title,
                            type: 'paper',
                            snippet: getSnippet(p.memo, searchPattern),
                            updated_at: p.created_at
                        });
                    }
                });
            }

            // 3. Search Journal
            const { data: journal } = await supabase
                .from('journal')
                .select('id, content, created_at')
                .ilike('content', `%${searchPattern}%`);

            if (journal) {
                journal.forEach(j => {
                    foundLinks.push({
                        id: j.id,
                        title: 'Journal Entry',
                        type: 'journal',
                        snippet: getSnippet(j.content, searchPattern),
                        updated_at: j.created_at
                    });
                });
            }

            setLinks(foundLinks);

        } catch (e) {
            console.error('Error fetching backlinks:', e);
        } finally {
            setLoading(false);
        }
    };

    const getSnippet = (content: string, term: string) => {
        if (!content) return '';
        const idx = content.toLowerCase().indexOf(term.toLowerCase());
        if (idx === -1) return content.substring(0, 100);

        const start = Math.max(0, idx - 40);
        const end = Math.min(content.length, idx + term.length + 40);
        return '...' + content.substring(start, end) + '...';
    };

    if (loading) return <div className="text-gray-400 text-xs animate-pulse">Scanning links...</div>;
    if (links.length === 0) return null;

    return (
        <div className="mt-8 border-t border-gray-100 pt-6">
            <h3 className="text-sm font-semibold text-gray-500 mb-4 flex items-center gap-2">
                <Link2 size={14} /> Linked Mentions
            </h3>
            <div className="grid grid-cols-1 gap-3">
                {links.map((link, i) => (
                    <div key={`${link.type}-${link.id}-${i}`} className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm">
                        <div className="flex justify-between items-center mb-1">
                            <span className={`text-xs px-1.5 rounded uppercase font-medium tracking-wide
                                ${link.type === 'note' ? 'bg-blue-100 text-blue-700' :
                                    link.type === 'paper' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                                {link.type}
                            </span>
                            <span className="text-xs text-gray-400">{new Date(link.updated_at).toLocaleDateString()}</span>
                        </div>
                        <Link
                            href={link.type === 'note' ? `/private/notes?id=${link.id}` :
                                link.type === 'paper' ? `/private/papers?id=${link.id}` : '/private/journal'}
                            className="font-medium text-gray-800 hover:text-blue-600 hover:underline block mb-1"
                        >
                            {link.title}
                        </Link>
                        <p className="text-gray-500 text-xs font-mono">{link.snippet}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
