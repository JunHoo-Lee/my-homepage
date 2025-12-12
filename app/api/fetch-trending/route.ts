// /app/api/fetch-trending/route.ts
import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

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

// Helper: Summarize with Gemini
async function summarizeWithGemini(title: string, abstract: string): Promise<string | null> {
    if (!GEMINI_API_KEY) return null;
    try {
        const prompt = `
            Summarize this paper abstract into a ONE sentence TLDR in Korean.
            Title: ${title}
            Abstract: ${abstract}
            Output: Korean TLDR string only.
        `;
        const res = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
    } catch (e) {
        console.error("Gemini summary failed", e);
        return null;
    }
}

// Helper: Summarize with OpenAI
async function summarizeWithOpenAI(title: string, abstract: string): Promise<string | null> {
    if (!OPENAI_API_KEY) return null;
    try {
        const prompt = `Summarize this paper into a ONE sentence TLDR in Korean.\nTitle: ${title}\nAbstract: ${abstract}`;
        const res = await fetch(OPENAI_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini", // Cost effective
                messages: [{ role: "user", content: prompt }],
                max_tokens: 100
            })
        });
        const data = await res.json();
        return data.choices?.[0]?.message?.content?.trim() || null;
    } catch (e) {
        console.error("OpenAI summary failed", e);
        return null;
    }
}

// Robust Summarizer
async function getTLDR(title: string, abstract: string) {
    // 1. Try Gemini
    let tldr = await summarizeWithGemini(title, abstract);
    if (tldr && !tldr.includes("요약 불가")) return tldr;

    // 2. Fallback to OpenAI
    console.log(`Falling back to OpenAI for: ${title}`);
    tldr = await summarizeWithOpenAI(title, abstract);
    if (tldr) return tldr;

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

    // Slice for pagination
    // For collections, we want to fetch metadata then sort, THEN slice? 
    // Or slice then fetch?
    // Problem: logic requires sorting by date. If we slice the regex matches (which are likely roughly chronological but not guaranteed), 
    // we might miss newer papers if the page isn't perfectly ordered.
    // However, fetching ALL metadata to sort is too slow.
    // Compromise: Fetch a larger batch (e.g. count * 2 + offset), sort, then take the requested page. 
    // For now, let's trust the page order partially but fetch a bit more to be safe? 
    // Actually, looking at HF collections, they seem manual.
    // Let's fetch the slice requested + buffer?
    // User asked for "Sort by newest". 
    // Ideally we fetch metadata for ALL ids found on page (limited to reasonable number like 50), sort them, then paginate.

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

    // Apply Pagination (on the sorted list)
    // Note: This "local" pagination works if we always fetch the top N papers. 
    // But true "Next Page" for a generic collection requires stable ordering.
    // Since we fetch the TOP 50 from the page, slicing locally is okay as long as the user hasn't scrolled past 50.
    // If offset > 50, we might need a different strategy or just show what we have.
    // Given the request, let's just slice the validPapers.

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
    const { source, count = 10, offset = 0 } = await request.json();

    let papers: any[] = [];

    if (source === 'daily' || source === 'huggingface') {
        try {
            // Fetch MORE than needed to allow random selection
            const fetchCount = 30;
            const hfRes = await fetch('https://huggingface.co/api/daily_papers');
            if (hfRes.ok) {
                const hfData = await hfRes.json();

                // If it's the first load (offset 0), we random shuffle.
                // If it's a "Load More" (pagination), we probably shouldn't shuffle or we get duplicates.
                // BUT, Daily Papers usually doesn't have infinite scroll in this context, just "Refresh".
                // The user asked for "Random 10 on Refresh".
                // So if offset > 0 (pagination), we might just return empty or remaining?
                // Let's assume Daily is just a static shuffled list for now.

                // Map first
                let allPapers = hfData.map((p: any) => {
                    const paper = p.paper;
                    return {
                        title: paper.title || p.title,
                        authors: paper.authors ? paper.authors.map((a: any) => a.name).join(', ') : "Unknown",
                        link: `https://arxiv.org/abs/${paper.id}`,
                        source: 'Daily',
                        abstract: paper.summary || p.summary || "No abstract available"
                    };
                });

                // Shuffle!
                allPapers = shuffleArray(allPapers);

                // Slice
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

    // Parallel Summarization
    const papersWithTLDR = await Promise.all(papers.map(async (p) => {
        const tldr = await getTLDR(p.title, p.abstract);
        return { ...p, tldr_kr: tldr };
    }));

    return NextResponse.json({ papers: papersWithTLDR });
}
