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

// Scrapers
async function getCollectionPapers(url: string, sourceLabel: string, count: number) {
    const html = await fetchHTML(url);
    if (!html) return [];

    // Crude Regex Scraper for Hugging Face Collections
    // Looking for: <a class="..." href="/papers/2310.16818"> ... </a>
    // And trying to grab title.
    // HF Collection pages often list items. The structure is complex.
    // Let's look for standard paper links.
    const paperLinkRegex = /href="\/papers\/(\d+\.\d+)"[^>]*>([\s\S]*?)<\/a>/g;
    const matches = [...html.matchAll(paperLinkRegex)];

    // De-duplicate by ID
    const uniquePapers = new Map();

    for (const match of matches) {
        if (uniquePapers.size >= count) break;
        const id = match[1];
        const content = match[2];
        // Extract title from content - often it's inside text.
        // This is messy. Better strategy: Just get IDs, then fetch metadata via API?
        // HF has an API: https://huggingface.co/api/papers/2310.16818
        if (!uniquePapers.has(id)) {
            uniquePapers.set(id, { id, title: "Loading...", source: sourceLabel });
        }
    }

    // Now fetch metadata for these IDs
    const papers = await Promise.all(Array.from(uniquePapers.values()).map(async (p) => {
        try {
            const apiRes = await fetch(`https://huggingface.co/api/papers/${p.id}`);
            if (!apiRes.ok) return null;
            const data = await apiRes.json();
            return {
                title: data.title,
                authors: data.authors?.map((a: any) => a.name).join(', ') || "Unknown",
                link: `https://arxiv.org/abs/${p.id}`,
                source: sourceLabel,
                abstract: data.summary || "No abstract available"
            };
        } catch {
            return null;
        }
    }));

    return papers.filter(p => p !== null);
}

async function getTrendingPapers(count: number) {
    // https://huggingface.co/papers/trending
    // Logic similar to collections: Extract IDs, then API.
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
    const { source, count = 10 } = await request.json();

    let papers: any[] = [];

    if (source === 'daily' || source === 'huggingface') {
        try {
            const hfRes = await fetch('https://huggingface.co/api/daily_papers');
            if (hfRes.ok) {
                const hfData = await hfRes.json();
                const hfPapers = hfData.slice(0, count).map((p: any) => {
                    const paper = p.paper;
                    return {
                        title: paper.title || p.title,
                        authors: paper.authors ? paper.authors.map((a: any) => a.name).join(', ') : "Unknown",
                        link: `https://arxiv.org/abs/${paper.id}`,
                        source: 'Daily',
                        abstract: paper.summary || p.summary || "No abstract available"
                    };
                });
                papers = hfPapers;
            }
        } catch (e) { console.error(e); }
    }
    else if (source === 'trending') {
        papers = await getTrendingPapers(count);
    }
    else if (source === 'deepseek') {
        papers = await getCollectionPapers('https://huggingface.co/collections/Presidentlin/deepseek-papers', 'DeepSeek', count);
    }
    else if (source === 'bytedance') {
        // Need ByteDance URL. Assuming similar pattern or the one provided.
        // User provided: https://huggingface.co/collections/Presidentlin/bytedance-papers
        papers = await getCollectionPapers('https://huggingface.co/collections/Presidentlin/bytedance-papers', 'ByteDance', count);
    }

    // Parallel Summarization
    const papersWithTLDR = await Promise.all(papers.map(async (p) => {
        const tldr = await getTLDR(p.title, p.abstract);
        return { ...p, tldr_kr: tldr };
    }));

    return NextResponse.json({ papers: papersWithTLDR });
}
