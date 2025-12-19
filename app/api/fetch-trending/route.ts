// /app/api/fetch-trending/route.ts
import { NextResponse } from 'next/server';
import { generateText } from '@/utils/ai';

// Helper to fetch HTML text
async function fetchHTML(url: string) {
    try {
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }); // Fake UA to avoid some blocks
        if (!res.ok) return null;
        return await res.text();
    } catch (e) {
        console.error(`Failed to fetch ${url}`, e);
        return null;
    }
}

// Robust Summarizer using shared utility
async function getTLDR(title: string, abstract: string) {
    const prompt = `
        Summarize this paper abstract into a ONE sentence TLDR in Korean.
        Title: ${title}
        Abstract: ${abstract}
        Output: Korean TLDR string only.
    `;

    // generateText handles Gemini -> OpenAI fallback internally
    const tldr = await generateText(prompt);

    if (tldr && !tldr.includes("요약 불가")) return tldr.trim();

    return "요약 불가 (서비스 오류)";
}

// Helper to shuffle array
function shuffleArray(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Scrapers
async function getCollectionPapers(url: string, sourceLabel: string, count: number, offset: number = 0) {
    const html = await fetchHTML(url);
    if (!html) return [];

    const paperLinkRegex = /href="\/papers\/(\d+\.\d+)"[^>]*>([\s\S]*?)<\/a>/g;
    const matches = [...html.matchAll(paperLinkRegex)];

    // Get ALL IDs first, then slice for pagination
    // But duplicate IDs might exist, so use Set
    const uniqueIds = new Set<string>();
    for (const match of matches) {
        uniqueIds.add(match[1]);
    }

    // Convert to array
    const allIds = Array.from(uniqueIds);

    const limit = 50; // Cap to avoid timeouts
    const idsToFetch = allIds.slice(0, limit);

    // Fetch metadata
    let papers = await Promise.all(idsToFetch.map(async (id) => {
        try {
            const apiRes = await fetch(`https://huggingface.co/api/papers/${id}`);
            if (!apiRes.ok) return null;
            const data = await apiRes.json();
            return {
                title: data.title,
                authors: data.authors?.map((a: any) => a.name).join(', ') || "Unknown",
                link: `https://arxiv.org/abs/${id}`,
                source: sourceLabel,
                abstract: data.summary || "No abstract available",
                publishedAt: data.publishedAt || data.submittedOn // Use date for sorting
            };
        } catch {
            return null;
        }
    }));

    // Filter nulls
    let validPapers = papers.filter((p): p is NonNullable<typeof p> => p !== null);

    // Sort by Date Descending
    validPapers.sort((a, b) => {
        const dateA = new Date(a.publishedAt).getTime();
        const dateB = new Date(b.publishedAt).getTime();
        return dateB - dateA;
    });

    return validPapers.slice(offset, offset + count);
}

async function getTrendingPapers(count: number) {
    // https://huggingface.co/papers/trending
    const url = 'https://huggingface.co/papers/trending';
    const html = await fetchHTML(url);
    if (!html) return [];

    const paperLinkRegex = /href="\/papers\/(\d+\.\d+)"/g;
    const matches = [...html.matchAll(paperLinkRegex)];
    const ids = Array.from(new Set(matches.map(m => m[1]))).slice(0, count);

    const papers = await Promise.all(ids.map(async (id) => {
        try {
            const apiRes = await fetch(`https://huggingface.co/api/papers/${id}`);
            const data = await apiRes.json();
            return {
                title: data.title,
                authors: data.authors?.map((a: any) => a.name).join(', ') || "Unknown",
                link: `https://arxiv.org/abs/${id}`,
                source: 'HF Trending',
                abstract: data.summary || "No abstract available"
            };
        } catch {
            return null;
        }
    }));
    return papers.filter(p => p !== null);
}

export async function POST(request: Request) {
    const { source, count = 10, offset = 0, date } = await request.json();

    let papers: any[] = [];

    if (source === 'daily' || source === 'huggingface') {
        try {
            // Fetch MORE than needed to allow random selection
            const fetchCount = 30;
            // Append date if provided
            const url = date
                ? `https://huggingface.co/api/daily_papers?date=${date}`
                : 'https://huggingface.co/api/daily_papers';

            const hfRes = await fetch(url);
            if (hfRes.ok) {
                const hfData = await hfRes.json();

                // Map first
                let allPapers = hfData.map((p: any) => {
                    const paper = p.paper;
                    return {
                        id: paper.id, // Keep ID for Arxiv link construction if needed
                        title: paper.title || p.title,
                        authors: paper.authors ? paper.authors.map((a: any) => a.name).join(', ') : "Unknown",
                        link: `https://arxiv.org/abs/${paper.id}`,
                        pdf: `https://arxiv.org/pdf/${paper.id}.pdf`,
                        source: 'Daily',
                        abstract: paper.summary || p.summary || "No abstract available",
                        publishedAt: p.publishedAt || paper.publishedAt
                    };
                });

                // Do NOT shuffle if date is specific? Keep it consistent? 
                // Creating a stable list is better for pagination, but HF daily papers list is small enough.
                // The original code shuffled. Let's keep shuffling or maybe removing it to be deterministic?
                // For "Daily", we usually want *all* of them or ordered by popularity (upvotes). 
                // HF API returns them sorted by upvotes usually. Let's Return VALID papers without shuffling for now to match "Ranking".
                // actually original code shuffled. Let's not shuffle if we want "Trending" feel.

                papers = allPapers.slice(0, count);
            }
        } catch (e) { console.error(e); }
    }
    else if (source === 'trending') {
        papers = await getTrendingPapers(count);
    }
    else if (source === 'deepseek') {
        papers = await getCollectionPapers('https://huggingface.co/collections/Presidentlin/deepseek-papers', 'DeepSeek', count, offset);
    }
    else if (source === 'bytedance') {
        papers = await getCollectionPapers('https://huggingface.co/collections/Presidentlin/bytedance-papers', 'ByteDance', count, offset);
    }

    // REMOVED EAGER TLDR GENERATION
    // meaningful improvement in latency

    return NextResponse.json({ papers });
}
