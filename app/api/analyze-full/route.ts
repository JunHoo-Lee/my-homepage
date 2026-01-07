import { NextResponse } from 'next/server';
import { generateText } from '@/utils/ai';

export async function POST(request: Request) {
    const { link, title } = await request.json();

    if (!link) {
        return NextResponse.json({ error: 'Missing link' }, { status: 400 });
    }

    try {
        // 1. Extract Arxiv ID
        const arxivIdMatch = link.match(/(\d+\.\d+)/);
        if (!arxivIdMatch) {
            return NextResponse.json({ error: 'Only Arxiv papers are supported for full analysis currently.' }, { status: 400 });
        }
        const arxivId = arxivIdMatch[1];

        // 2. Fetch Ar5iv HTML
        const ar5ivUrl = `https://ar5iv.labs.arxiv.org/html/${arxivId}`;
        const res = await fetch(ar5ivUrl);
        if (!res.ok) {
            throw new Error(`Failed to fetch Ar5iv: ${res.status}`);
        }
        const html = await res.text();

        // 3. Extract Text (Simple approach)
        // Ar5iv uses <article> or <main>
        let content = '';
        const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/) || html.match(/<main[^>]*>([\s\S]*?)<\/main>/);

        if (articleMatch) {
            content = articleMatch[1].replace(/<[^>]*>?/gm, ' ');
        } else {
            content = html.replace(/<[^>]*>?/gm, ' '); // Full page fallback
        }

        // Cleanup and Cap
        const cleanContent = content.trim().replace(/\s+/g, ' ').substring(0, 40000); // ~10k words cap

        // 4. Summarize deeply
        const prompt = `
            You are a senior research AI. I will provide the full text of a research paper titled "${title}".
            Please provide a deep and technical technical summary in Korean (한국어).
            
            Structure:
            1. **한 줄 요약 (TL;DR)**: Concise overview.
            2. **핵심 기여 (Core Contributions)**: Bullet points of what's new.
            3. **상세 분석 (Detailed Analysis)**: Methodology, experiments, and results.
            4. **결론 및 시사점 (Conclusion & Insights)**: Why it matters.
            
            Use Markdown formatting. Use professional and academic tone.
            
            Paper Content:
            ${cleanContent}
        `;

        const analysis = await generateText(prompt);

        return NextResponse.json({ analysis: analysis || "분석 실패" });

    } catch (e: any) {
        console.error("Full Analysis failed", e);
        return NextResponse.json({ error: `Analysis failed: ${e.message}` }, { status: 500 });
    }
}
