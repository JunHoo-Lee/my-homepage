// /app/api/fetch-trending/route.ts
import { NextResponse } from 'next/server';
import { generateText } from '@/utils/ai';
import { parseStringPromise } from 'xml2js';

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

// Helper to fetch and parse RSS/Atom feeds
async function fetchRSS(url: string, sourceLabel: string) {
    try {
        const xml = await fetchHTML(url);
        if (!xml) return [];

        const result = await parseStringPromise(xml);
        let items: any[] = [];
        let feedType = 'rss';

        // Detect Atom vs RSS
        if (result.feed && result.feed.entry) {
            feedType = 'atom'; // e.g., YouTube, BAIR
            items = result.feed.entry;
        } else if (result.rss && result.rss.channel && result.rss.channel[0].item) {
            feedType = 'rss'; // e.g., Google Research often
            items = result.rss.channel[0].item;
        }

        return items.map((item: any) => {
            let title = '';
            let link = '';
            let date = '';
            let abstract = '';
            let authors = sourceLabel; // Default to source name if no author found

            if (feedType === 'atom') {
                title = item.title?.[0] || '';
                // YouTube link handling
                if (item['yt:videoId']) {
                    link = `https://www.youtube.com/watch?v=${item['yt:videoId'][0]}`;
                } else if (item.link && item.link[0]?.$?.href) {
                    link = item.link[0].$.href;
                }
                date = item.published?.[0] || item.updated?.[0] || '';

                // Summary/Content
                if (item['media:group'] && item['media:group'][0]['media:description']) {
                    abstract = item['media:group'][0]['media:description'][0];
                } else if (item.summary) {
                    abstract = item.summary[0] || '';
                    if (typeof abstract !== 'string') abstract = abstract['_'] || ''; // Handle complex summary objects
                } else if (item.content) {
                    abstract = item.content[0]?._ || item.content[0] || '';
                }

                // Author
                if (item.author && item.author[0].name) {
                    authors = item.author[0].name[0];
                }

            } else {
                // RSS
                title = item.title?.[0] || '';
                link = item.link?.[0] || '';
                date = item.pubDate?.[0] || '';
                abstract = item.description?.[0] || '';
                if (item['dc:creator']) {
                    authors = item['dc:creator'][0];
                }
            }

            // Cleanup basic HTML from abstract if needed (simple regex)
            const cleanAbstract = abstract.replace(/<[^>]*>?/gm, ' ').substring(0, 300) + '...';

            return {
                title,
                link,
                authors,
                source: sourceLabel,
                abstract: cleanAbstract,
                publishedAt: date
            };
        });

    } catch (e) {
        console.error(`RSS Fetch Error for ${sourceLabel}:`, e);
        return [];
    }
}

async function getByteDancePapers(count: number) {
    // Scrape from https://seed.bytedance.com/en/public_papers?view_from=research
    const url = 'https://seed.bytedance.com/en/public_papers?view_from=research';
    const html = await fetchHTML(url);
    if (!html) return [];

    const papers: any[] = [];

    // Simple regex to find blocks assuming standard layout
    // href="/public_papers/..." followed by title etc.
    // This is brittle but "static HTML" assumption was made.

    // Extract logical blocks if possible. 
    // Based on inspection, links look like /public_papers/slug
    // Let's try to find title and link.

    const paperLinkRegex = /href="(\/public_papers\/[^"]+)"/g;
    const matches = [...html.matchAll(paperLinkRegex)];
    const uniqueLinks = new Set(matches.map(m => m[1]));

    const linkArray = Array.from(uniqueLinks).slice(0, count);

    // We can't easy get title from just the link without parsing the DOM structure better.
    // If we assume the link text is the title, or it's inside the A tag.
    // Let's try a split approach.

    // <a ... href="/public_papers/..." ... > ... <div ...> Title </div> ... </a>
    // Since regex parsing HTML is limited, let's try to get a "Close enough" list.
    // Or fetch the individual pages? No that's too slow.

    // Let's attempt to use regex to capture the immediate text content after the link or inside it.
    // Given the difficulty, let's infer title from Slug if we can't find it? No, looks bad.

    // Let's try a slightly more complex regex to capture the whole <a> tag if possible, 
    // or just assume we have to accept some messiness.

    // For now, let's try to map the Slug to a Title format as a fallback.

    for (const link of linkArray) {
        const fullLink = `https://seed.bytedance.com${link}`;
        const slug = link.split('/').pop() || "";
        const title = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); // Title Case from slug

        papers.push({
            title: title + " (ByteDance)", // Explicitly mark until we parse better
            link: fullLink,
            authors: "ByteDance Research",
            source: "ByteDance",
            abstract: "Click to read paper details.",
            publishedAt: new Date().toISOString() // Unknown date
        });
    }

    return papers;
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

async function getTrendingPapers(count: number, period?: string) {
    let url = 'https://huggingface.co/papers/trending';
    if (period === 'weekly') url = 'https://huggingface.co/papers?period=weekly';
    if (period === 'monthly') url = 'https://huggingface.co/papers?period=monthly';

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
                id: data.id,
                title: data.title,
                authors: data.authors?.map((a: any) => a.name).join(', ') || "Unknown",
                link: `https://arxiv.org/abs/${id}`,
                pdf: `https://arxiv.org/pdf/${id}.pdf`,
                source: period ? `HF ${period.charAt(0).toUpperCase() + period.slice(1)}` : 'HF Trending',
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
                        id: paper.id,
                        title: paper.title || p.title,
                        authors: paper.authors ? paper.authors.map((a: any) => a.name).join(', ') : "Unknown",
                        link: `https://arxiv.org/abs/${paper.id}`,
                        pdf: `https://arxiv.org/pdf/${paper.id}.pdf`,
                        source: 'Daily',
                        abstract: paper.summary || p.summary || "No abstract available",
                        publishedAt: p.publishedAt || paper.publishedAt
                    };
                });

                papers = allPapers.slice(offset, offset + count);
            }
        } catch (e) { console.error(e); }
    }
    else if (source === 'trending' || source === 'weekly' || source === 'monthly') {
        papers = await getTrendingPapers(count, source === 'trending' ? undefined : source);
    }
    else if (source === 'youtube') {
        papers = await fetchRSS('https://www.youtube.com/feeds/videos.xml?channel_id=UConVfxXodg78Tzh5nNu85Ew', 'Two Minute Papers');
    }
    else if (source === 'bair') {
        papers = await fetchRSS('https://bair.berkeley.edu/blog/feed.xml', 'BAIR Blog');
    }
    else if (source === 'google_research') {
        papers = await fetchRSS('https://research.google/blog/rss/', 'Google Research');
    }
    else if (source === 'bytedance') {
        papers = await getByteDancePapers(count);
    }
    else if (source === 'deepseek') {
        papers = await getCollectionPapers('https://huggingface.co/collections/Presidentlin/deepseek-papers', 'DeepSeek', count, offset);
    }

    return NextResponse.json({ papers });
}
