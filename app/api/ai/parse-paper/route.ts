import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';
import { generateJSON } from '@/utils/ai';

export async function POST(request: Request) {
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
        const parsedPaper = await generateJSON(prompt);

        if (!parsedPaper) {
            return NextResponse.json({ error: 'AI failed to parse paper' }, { status: 500 });
        }

        return NextResponse.json({ paper: parsedPaper });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Failed to parse paper' }, { status: 500 });
    }
}
