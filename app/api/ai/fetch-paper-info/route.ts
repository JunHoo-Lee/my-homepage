import { NextResponse } from 'next/server';
import { parseStringPromise } from 'xml2js';
import { generateText } from '@/utils/ai';

export async function POST(request: Request) {
    const { title } = await request.json();

    if (!title) {
        return NextResponse.json({ error: 'Missing title' }, { status: 400 });
    }

    try {
        // 1. Search Arxiv
        const arxivUrl = `http://export.arxiv.org/api/query?search_query=ti:${encodeURIComponent(title)}&max_results=1`;
        const arxivRes = await fetch(arxivUrl);
        const xml = await arxivRes.text();
        const result = await parseStringPromise(xml);
        const Entry = result.feed.entry?.[0];

        if (!Entry) {
            return NextResponse.json({ error: 'Paper not found on Arxiv' }, { status: 404 });
        }

        const paperData = {
            title: Entry.title[0].trim().replace(/\n/g, ' '),
            authors: Entry.author.map((a: any) => a.name[0]).join(', '),
            link: Entry.id[0],
            pdf: Entry.link.find((l: any) => l.$.title === 'pdf')?.$?.href,
            abstract: Entry.summary[0].trim()
        };

        // 2. Generate Korean TLDR
        const prompt = `
            Summarize this paper abstract into a ONE sentence TLDR in Korean.
            Title: ${paperData.title}
            Abstract: ${paperData.abstract}
            Output: Korean TLDR string only.
        `;
        const tldr = await generateText(prompt);

        return NextResponse.json({
            paper: {
                ...paperData,
                memo: tldr ? `**TL;DR**: ${tldr.trim()}` : ''
            }
        });

    } catch (e) {
        console.error("Fetch Paper Info failed", e);
        return NextResponse.json({ error: "Failed to fetch paper info" }, { status: 500 });
    }
}
