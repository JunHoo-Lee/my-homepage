import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';
import { generateJSON } from '@/utils/ai';

export async function POST(request: Request) {
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
        const parsedNote = await generateJSON(prompt);

        if (!parsedNote) {
            return NextResponse.json({ error: 'AI failed to parse note' }, { status: 500 });
        }

        return NextResponse.json({ note: parsedNote });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to parse note' }, { status: 500 });
    }
}
