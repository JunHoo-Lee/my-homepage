import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';
import { generateJSON } from '@/utils/ai';

export async function POST(request: Request) {
    const { input } = await request.json();

    // 1. Fetch existing tags for context
    const { data: tagsData } = await supabase.from('tags').select('name');
    const existingTags = tagsData?.map(t => t.name) || [];

    // 2. Prompt Gemini
    const currentDate = new Date().toISOString();
    const prompt = `
    You are a smart personal assistant. Parse the natural language input into a structured JSON for a task manager.
    
    Current Date: ${currentDate}
    Input: "${input}"
    Existing Tags: ${JSON.stringify(existingTags)}
    
    Rules:
    - "is_new" should be true.
    - "priority": specific high/medium/low if mentioned or implied explicitly, else decide based on urgency.
    - "due_date": Parse relative dates (e.g. "next friday") into YYYY-MM-DD format based on Current Date. If no date, null.
    - "tags": Suggest relevant tags from Existing Tags, or create new short ones if necessary. Array of strings.
    
    Output JSON Schema:
    {
      "title": "string (concise)",
      "memo": "string (details or null)",
      "is_new": true,
      "tags": ["string"],
      "priority": "High" | "Medium" | "Low",
      "due_date": "YYYY-MM-DD" | null
    }

    Return ONLY the raw JSON string.
  `;

    try {
        const parsedTask = await generateJSON(prompt);
        if (!parsedTask) {
            return NextResponse.json({ error: 'AI failed to parse task' }, { status: 500 });
        }

        return NextResponse.json({ task: parsedTask });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Failed to parse task' }, { status: 500 });
    }
}
