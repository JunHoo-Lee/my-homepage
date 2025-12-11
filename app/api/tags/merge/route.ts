import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

export async function POST(request: Request) {
    const { targetName, sourceIds } = await request.json(); // merge sourceIds into targetName

    // 1. Get or create target tag
    let targetTagId;
    const { data: existingTarget } = await supabase
        .from('tags')
        .select('id, usage_count')
        .eq('name', targetName)
        .single();

    if (existingTarget) {
        targetTagId = existingTarget.id;
    } else {
        const { data: newTarget } = await supabase
            .from('tags')
            .insert({ name: targetName })
            .select()
            .single();
        targetTagId = newTarget?.id;
    }

    if (!targetTagId) {
        return NextResponse.json({ error: 'Failed to identify target tag' }, { status: 500 });
    }

    // 2. Update all references in tasks, papers, notes
    // This is tricky because tags are currently text[] arrays in other tables.
    // If we were using relation tables (tasks_tags), we would update IDs.
    // Since we are using text[], we need to replace the string in the array.
    // Supabase (Postgres) array functions needed.

    // However, updating text arrays across all rows efficiently is complex in one go.
    // For now, we will just delete the old tags from the 'tags' table. 
    // The references in tasks/notes (text[]) will remain as strings (e.g. 'DL'). 
    // Ideally, we should update those tasks to say 'deep-learning'.

    // Let's iterate and update. This might be slow if many records, but for personal homepage it's fine.
    // We need to fetch the names of the sourceIds.

    const { data: sourceTags } = await supabase
        .from('tags')
        .select('name')
        .in('id', sourceIds);

    const sourceNames = sourceTags?.map(t => t.name) || [];

    // Update Tasks
    // Postgres: array_replace(tags, 'old', 'new')
    // We can use RPC or raw SQL via Supabase if possible, but simplest is client-side loop for MVP.
    // Actually, let's use a smarter approach: update where tags @> {old_name}

    for (const oldName of sourceNames) {
        if (oldName === targetName) continue;

        // Update Tasks
        // We will fetch tasks that have the old tag, remove it, add new one.
        const { data: tasks } = await supabase
            .from('tasks')
            .select('id, tags')
            .contains('tags', [oldName]);

        if (tasks) {
            for (const item of tasks) {
                const newTags = item.tags.filter((t: string) => t !== oldName);
                if (!newTags.includes(targetName)) newTags.push(targetName);
                await supabase.from('tasks').update({ tags: newTags }).eq('id', item.id);
            }
        }

        // Update Papers
        const { data: papers } = await supabase
            .from('papers')
            .select('id, tags')
            .contains('tags', [oldName]);

        if (papers) {
            for (const item of papers) {
                const newTags = item.tags.filter((t: string) => t !== oldName);
                if (!newTags.includes(targetName)) newTags.push(targetName);
                await supabase.from('papers').update({ tags: newTags }).eq('id', item.id);
            }
        }

        // Update Notes
        const { data: notes } = await supabase
            .from('notes')
            .select('id, tags')
            .contains('tags', [oldName]);

        if (notes) {
            for (const item of notes) {
                const newTags = item.tags.filter((t: string) => t !== oldName);
                if (!newTags.includes(targetName)) newTags.push(targetName);
                await supabase.from('notes').update({ tags: newTags }).eq('id', item.id);
            }
        }

        // Update Journal -- journal also has tags
        const { data: journal } = await supabase
            .from('journal')
            .select('id, tags')
            .contains('tags', [oldName]);

        if (journal) {
            for (const item of journal) {
                const newTags = item.tags ? item.tags.filter((t: string) => t !== oldName) : [];
                if (!newTags.includes(targetName)) newTags.push(targetName);
                await supabase.from('journal').update({ tags: newTags }).eq('id', item.id);
            }
        }
    }

    // 3. Delete source tags
    const { error: deleteError } = await supabase
        .from('tags')
        .delete()
        .in('id', sourceIds);

    if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
