import OpenAI from 'openai';

const XAI_API_KEY = process.env.XAI_API_KEY || process.env.GROK_API_KEY;

const client = new OpenAI({
    apiKey: XAI_API_KEY,
    baseURL: 'https://api.x.ai/v1',
});

// Types for our expected output
export interface ScholarInboxItem {
    title: string;
    authors: string;
    link: string;
    tldr: string;
    relevance_reason: string;
    source: 'X' | 'Web' | string;
    published_date?: string;
}

/**
 * Performs an agentic search using Grok-4 fast to find relevant papers/discussions.
 * Uses 'web_search' and 'x_search' tools.
 */
export async function performScholarSearch(
    interests: string[],
    userProfile: string,
    recentPapers: string[] = [],
    dateMargin?: string
): Promise<ScholarInboxItem[]> {
    if (!XAI_API_KEY) {
        console.error("Missing XAI_API_KEY");
        return [];
    }

    // Determine date range text
    const dateInstruction = dateMargin
        ? `5. **DATE FILTER**: RESTRICT search to items from **${dateMargin} onwards**. Do NOT return older items.`
        : `5. **DATE FILTER**: Prioritize very recent items (last 3 months).`;

    const systemPrompt = `
    You are a "Scholar Inbox" agent acting as a research assistant for a PhD student.
    
    ## User Research Profile
    ${userProfile}
    
    ## Recently Added Papers (Do NOT suggest these again)
    ${recentPapers.join("; ")}
    
    ## Current Context / Keywords
    ${interests.join(", ")}
    
    ## Instructions:
    1. **Analyze** the user's profile and keywords.
    2. **SEARCH X (Twitter)**: Use the \`x_search\` tool significantly.
        - **Viral Threads**: Search for "min_faves:50 [topic]" or "min_reposts:10 [topic]" to find high-signal discussions.
        - **Labs/People**: Search for updates from "DeepMind", "OpenAI", "Kaiming He", "ByteDance Research".
        - **Goal**: Find twitter threads that explain papers simply or show cool demos.
    3. **SEARCH WEB**: Use the \`web_search\` tool for arXiv/Google Scholar checks to verify paper existence or find non-viral high-quality papers.
    4. **FILTER**: Only keep items that match the "Paper Preferences".
    ${dateInstruction}
    6. **FORMAT**: Output strictly a JSON array.
    
    ## Output Format (JSON Array ONLY):
    [
        {
            "title": "Paper/Thread Title (or Tweet Summary)",
            "authors": "Authors or Thread Author (@username)",
            "link": "URL (Twitter link if source is X)",
            "tldr": "One sentence summary in Korean (Subjective & Casual style). If it's a tweet, summarize the 'vibe' or key claim.",
            "relevance_reason": "One sentence explaining why this fits the user's specific interests (Korean)",
            "source": "X" or "Web",
            "published_date": "YYYY-MM-DD"
        }
    ]
    `;

    try {
        const response = await fetch('https://api.x.ai/v1/responses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${XAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "grok-4-1-fast",
                input: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Check for the latest interesting papers/updates.${dateMargin ? ` (Since ${dateMargin})` : ''}` }
                ],
                tools: [
                    { type: "web_search" },
                    { type: "x_search" }
                ],
                stream: false
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Grok API Error:", response.status, errorText);
            return [];
        }

        const data = await response.json();

        // The /v1/responses endpoint returns an 'output' array.
        // We need to find the entry that contains 'content'.
        // Example: { output: [ { type: 'tool_call' }, { content: [{ text: "..." }] } ] }

        let content = "";
        if (data.output && Array.isArray(data.output)) {
            for (const item of data.output) {
                if (item.content && Array.isArray(item.content)) {
                    for (const part of item.content) {
                        if (part.type === 'output_text' && part.text) {
                            content += part.text;
                        }
                    }
                }
            }
        }

        if (!content) return [];

        // Clean up markdown code blocks if present
        const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            const parsed = JSON.parse(cleanJson);
            if (Array.isArray(parsed)) {
                return parsed as ScholarInboxItem[];
            }
            if (parsed.items && Array.isArray(parsed.items)) {
                return parsed.items as ScholarInboxItem[];
            }
            return [];
        } catch (e) {
            console.error("Failed to parse Grok JSON:", e);
            console.log("Raw content:", content);
            return [];
        }

    } catch (error) {
        console.error("Grok Agentic Search Failed:", error);
        return [];
    }
}
