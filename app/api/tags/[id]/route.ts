import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const p = await params;
    const { name } = await request.json();

    const { error } = await supabase
        .from('tags')
        .update({ name })
        .eq('id', p.id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const p = await params;
    const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', p.id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
}
