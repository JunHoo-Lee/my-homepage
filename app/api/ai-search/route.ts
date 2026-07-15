import { NextResponse } from 'next/server';
import { performAdvancedSearch, SearchConfig } from '@/utils/xai';

export const maxDuration = 300; // Allow longer timeout for agentic search

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const config: SearchConfig = {
            mode: body.mode,
            conferenceName: body.conferenceName,
            query: body.query,
            dateLimit: body.dateLimit,
            targetPaperTitle: body.targetPaperTitle,
            targetPaperContext: body.targetPaperContext,
            // Profile stuff not needed for this route yet unless we merge
        };

        if (!config.mode) {
            return NextResponse.json({ error: "Missing search mode" }, { status: 400 });
        }

        console.log(`[AI Search] Starting search in mode: ${config.mode}`);
        const papers = await performAdvancedSearch(config);

        return NextResponse.json({ papers });

    } catch (error: any) {
        console.error("AI Search API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
