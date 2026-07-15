// /app/api/recommend-papers/route.ts
import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

export async function POST(request: Request) {
    const { user_tags, recent_papers } = await request.json(); // user's context
    // recent_papers: provided by client (the trending list fetching in client first, then filtered)
    // or we fetch trending here again? Better if client passes the list to be filtered to save calls/time 
    // or we just call the fetch-trending logic internally.
    // Client passing is flexible.

    const trendingPapers = recent_papers as any[];

    if (!trendingPapers || trendingPapers.length === 0) {
        return NextResponse.json({ papers: [] });
    }

    const prompt = `
    You are a research paper recommender.
    
    User Interests (Tags): ${JSON.stringify(user_tags)}
    
    Candidate Papers:
    ${JSON.stringify(trendingPapers.map((p, i) => ({ id: i, title: p.title, tldr: p.tldr_kr })))}
    
    Task:
    Select the papers that are HIGHLY relevant to the user's interests.
    For each selected paper, provide a brief "relevance_reason" (e.g. "Related to your interest in Diffusion Models").
    
    Output JSON Schema:
    [
      {
        "id": number (index from candidate list),
        "relevance_reason": "string"
      }
    ]
    
    Return ONLY the raw JSON string. If none relevant, return empty array [].
    `;

    try {
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const recommendations = JSON.parse(jsonStr); // [{id, relevance_reason}]

        // Merge back
        const recommendedPapers = recommendations.map((rec: any) => {
            const original = trendingPapers[rec.id];
            return {
                ...original,
                relevance_reason: rec.relevance_reason
            };
        });

        return NextResponse.json({ papers: recommendedPapers });

    } catch (error) {
        console.error('Gemini Recommendation Error:', error);
        return NextResponse.json({ error: 'Failed to recommend papers' }, { status: 500 });
    }
}
