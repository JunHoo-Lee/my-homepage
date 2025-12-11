import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

export async function POST(request: Request) {
    if (!GEMINI_API_KEY) {
        return NextResponse.json({ error: 'Gemini API Key missing' }, { status: 500 });
    }

    const { input } = await request.json(); // input is link or text

    // Fetch existing tags
    const { data: tagsData } = await supabase.from('tags').select('name');
    const existingTags = tagsData?.map(t => t.name) || [];

    const prompt = `
    You are a research assistant. Extract paper details from the input (citation string, link, or title).
    
    Input: "${input}"
    Existing Tags: ${JSON.stringify(existingTags)}
    
    Output JSON Schema:
    {
      "title": "string",
      "authors": "string (comma separated)",
      "link": "string (url or null)",
      "tags": ["string"] (suggest relevant tags)
    }
    
    Return ONLY the raw JSON string.
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
        if (!data.candidates || data.candidates.length === 0) {
            return NextResponse.json({ error: 'Gemini returned no candidates.' }, { status: 500 });
        }

        const text = data.candidates[0].content.parts[0].text;
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedPaper = JSON.parse(jsonStr);

        return NextResponse.json({ paper: parsedPaper });

    } catch (error) {
        console.error('Gemini API Error:', error);
        return NextResponse.json({ error: 'Failed to parse paper' }, { status: 500 });
    }
}
