import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';
import { performScholarSearch, ScholarInboxItem } from '@/utils/xai';
import fs from 'fs';
import path from 'path';

export const maxDuration = 60; // Allow longer timeout for agentic search

// Helper to extract titles from app/(public)/page.tsx
async function getHardcodedInterests() {
    try {
        // Read the file directly from the filesystem
        const filePath = path.join(process.cwd(), 'app', '(public)', 'page.tsx');
        const fileContent = fs.readFileSync(filePath, 'utf-8');

        // Regex to find title="Something" inside PublicationItem
        const regex = /title="([^"]+)"/g;
        const matches = [...fileContent.matchAll(regex)];

        return matches.map(m => m[1]);
    } catch (e) {
        console.error("Failed to read public page for interests:", e);
        return [];
    }
}

import { SCHOLAR_PROFILE } from './profile';

export async function POST(request: Request) {
    try {
        const { dateMargin } = await request.json().catch(() => ({}));

        // 1. Gather Context (User Interests)
        // User explicitly requested to ONLY use the Scholar Profile and REMOVE tasks/recent papers.
        // "그냥 내 초창기 관심사 내가 준거. 그거만 가지고 해." -> Just use the initial profile.

        const uniqueInterests: string[] = [];
        // We pass empty array because SCHOLAR_PROFILE in the system prompt contains all the necessary context.

        // However, user requested to pass "Recently added paper list" as input to avoid duplicates.
        const { data: recentPapers } = await supabase.from('papers').select('title').order('created_at', { ascending: false }).limit(20);
        const existingTitles = recentPapers?.map(p => p.title) || [];

        console.log("Searching with STRICT Profile only. Date Margin:", dateMargin);

        // 2. Perform Agentic Search
        // Pass dynamic interests + STATIC PROFILE + Existing Titles + Date Margin
        const searchResults = await performScholarSearch(uniqueInterests, SCHOLAR_PROFILE, existingTitles, dateMargin);

        if (searchResults.length === 0) {
            return NextResponse.json({ message: "No results found", papers: [] });
        }

        // 3. Store in DB
        const papersToInsert = searchResults.map(item => ({
            title: item.title,
            authors: item.authors || "Unknown",
            link: item.link,
            // Rich Memo: TLDR + Why Relevant
            memo: `**TL;DR**: ${item.tldr}\n\n**Relation**: ${item.relevance_reason}\n\n(Source: ${item.source})`,
            status: 'unread',
            tags: ['Scholar Inbox', item.source],
        }));

        // Deduplicate logic
        const links = papersToInsert.map(p => p.link);
        const { data: existing } = await supabase.from('papers').select('link').in('link', links);
        const existingLinks = new Set(existing?.map(e => e.link) || []);
        const newPapers = papersToInsert.filter(p => !existingLinks.has(p.link));

        if (newPapers.length > 0) {
            const { error } = await supabase.from('papers').insert(newPapers);
            if (error) throw error;
        }

        return NextResponse.json({ success: true, count: newPapers.length, papers: newPapers });

    } catch (e: any) {
        console.error("Scholar Inbox Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
