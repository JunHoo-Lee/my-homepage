import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

export async function POST(request: Request) {
    if (!GEMINI_API_KEY) {
        return NextResponse.json({ error: 'Gemini API Key missing' }, { status: 500 });
    }

    const { input } = await request.json();

    // 1. Fetch existing tags for context
    const { data: tagsData } = await supabase.from('tags').select('name');
    const existingTags = tagsData?.map(t => t.name) || [];

    // 2. Prompt Gemini
    const prompt = `
    You are a personal task assistant. Parse the following natural language input into a JSON object for a task manager.
    
    Input: "${input}"
    
    Existing Tags Pool: ${JSON.stringify(existingTags)}
    
    Output JSON Schema:
    {
      "title": "string (concise summary)",
      "memo": "string (details, nullable)",
      "priority": "High" | "Medium" | "Low" (infer from urgency)",
      "tags": ["string"] (select from pool if applicable, or create new short relevant tags),
      "due_date": "ISO string (future date)" | null
    }

    Return ONLY the raw JSON string, no markdown formatting.
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
            console.error('Gemini API Error Detail:', JSON.stringify(data, null, 2));
            return NextResponse.json({ error: 'Gemini returned no candidates. Check logs.' }, { status: 500 });
        }

        const text = data.candidates[0].content.parts[0].text;

        // Clean up markdown block if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedTask = JSON.parse(jsonStr);

        return NextResponse.json({ task: parsedTask });
    } catch (error) {
        console.error('Gemini API Error:', error);
        return NextResponse.json({ error: 'Failed to parse task' }, { status: 500 });
    }
}
