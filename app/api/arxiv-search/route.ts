
import { NextResponse } from 'next/server';
import { parseStringPromise } from 'xml2js';

export async function POST(request: Request) {
    const { query, start = 0, max_results = 10 } = await request.json();

    if (!query) {
        return NextResponse.json({ error: 'Missing query' }, { status: 400 });
    }

    try {
        const url = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=${start}&max_results=${max_results}&sortBy=lastUpdatedDate&sortOrder=descending`;

        const response = await fetch(url);
        const xml = await response.text();
        const result = await parseStringPromise(xml);

        const entries = result.feed.entry || [];

        const papers = entries.map((entry: any) => ({
            id: entry.id[0],
            title: entry.title[0].trim().replace(/\n/g, ' '),
            summary: entry.summary[0].trim(),
            authors: entry.author.map((a: any) => a.name[0]).join(', '),
            published: entry.published[0],
            link: entry.id[0], // Arxiv ID url
            pdf: entry.link.find((l: any) => l.$.title === 'pdf')?.$?.href
        }));

        return NextResponse.json({ papers });

    } catch (e) {
        console.error("Arxiv Search Failed", e);
        return NextResponse.json({ error: "Arxiv Search Failed" }, { status: 500 });
    }
}
