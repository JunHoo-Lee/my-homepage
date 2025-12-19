import { NextResponse } from 'next/server';
import { generateText } from '@/utils/ai';

export async function POST(request: Request) {
    const { title, abstract } = await request.json();

    if (!title || !abstract) {
        return NextResponse.json({ error: 'Missing title or abstract' }, { status: 400 });
    }

    const prompt = `
        Summarize this paper abstract into a ONE sentence TLDR in Korean.
        Title: ${title}
        Abstract: ${abstract}
        Output: Korean TLDR string only.
    `;

    try {
        const tldr = await generateText(prompt);
        return NextResponse.json({ tldr: tldr ? tldr.trim() : "요약 불가" });
    } catch (e) {
        console.error("TLDR Generation failed", e);
        return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
    }
}
