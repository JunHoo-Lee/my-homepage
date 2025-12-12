import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

export async function POST(request: Request) {
    if (!GEMINI_API_KEY) {
        console.error('Gemini API Key missing');
        return NextResponse.json({ error: 'Gemini API Key missing in environment variables' }, { status: 500 });
    }

    const { input } = await request.json(); // input is raw text of fleeting note

    // Fetch existing tags and folders (if we had a folders table, but we assume folder is text, so we can fetch distinct folders from notes)
    const { data: tagsData } = await supabase.from('tags').select('name');
    const existingTags = tagsData?.map(t => t.name) || [];

    // Fetch unique folder names from notes
    const { data: folderData } = await supabase.from('notes').select('folder');
    // @ts-ignore
    const existingFolders = [...new Set(folderData?.map(n => n.folder).filter(Boolean) || [])];

    // Fetch titles of notes and papers for backlink suggestions
    const { data: notesData } = await supabase.from('notes').select('id, title');
    const { data: papersData } = await supabase.from('papers').select('id, title');

    // Create a simplified list for context
    const contextNotes = notesData?.map(n => ({ id: n.id, title: n.title })) || [];
    const contextPapers = papersData?.map(p => ({ id: p.id, title: p.title })) || [];

    const prompt = `
    You are a personal knowledge management assistant. Parse the fleeting note into a structured Markdown note.
    
    Input Note: "${input}"
    
    Context:
    - Existing Tags: ${JSON.stringify(existingTags)}
    - Existing Folders: ${JSON.stringify(existingFolders)}
    - Potential Backlinks (Notes): ${JSON.stringify(contextNotes.slice(0, 50))} (limited to 50 for context)
    - Potential Backlinks (Papers): ${JSON.stringify(contextPapers.slice(0, 50))} (limited to 50 for context)
    
    Tasks:
    1. Format the content into clean Markdown.
    2. Suggest a concise 'title'.
    3. Suggest a 'folder' (categorize).
    4. Suggest 'tags' (reuse existing or create new).
    5. Identify potential backlinks to existing notes/papers if relevant. Return their IDs.
    
    Output JSON Schema:
    {
      "title": "string",
      "content": "markdown string",
      "folder": "string",
      "tags": ["string"],
      "linked_notes": ["uuid"],
      "linked_papers": ["uuid"]
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

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API Error Response:', errorText);
            throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.candidates || data.candidates.length === 0) {
            console.error('Gemini returned no candidates:', data);
            return NextResponse.json({ error: 'Gemini returned no candidates.' }, { status: 500 });
        }

        const text = data.candidates[0].content.parts[0].text;
        console.log('Gemini Raw Response:', text); // Debug log

        // Improved JSON cleaning: handle code blocks and potential noise
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

        let parsedNote;
        try {
            parsedNote = JSON.parse(jsonStr);
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError, 'Raw String:', jsonStr);
            return NextResponse.json({ error: 'Failed to parse AI response as JSON' }, { status: 500 });
        }

        return NextResponse.json({ note: parsedNote });

    } catch (error: any) {
        console.error('Gemini API Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to parse note' }, { status: 500 });
    }
}
