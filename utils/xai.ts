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
export async function performScholarSearch(interests: string[], userProfile: string): Promise<ScholarInboxItem[]> {
    if (!XAI_API_KEY) {
        console.error("Missing XAI_API_KEY");
        return [];
    }

    // We want a robust JSON output.
    const systemPrompt = `
    You are a "Scholar Inbox" agent acting as a research assistant for a PhD student.
    
    ## User Research Profile
    ${userProfile}
    
    ## Current Context / Keywords
    ${interests.join(", ")}
    
    ## Instructions:
    1. **Analyze** the user's profile and keywords.
    2. **SEARCH**: Use the \`live_search\` tool.
        - **IMPORTANT**: You must use \`live_search\` to search **X (Twitter)** for "site:x.com [topic]" or just "[topic]" to find viral threads/discussions.
        - Also use \`live_search\` to find recent arXiv papers.
    3. **FILTER**: Only keep items that match the "Paper Style Preferences".
    4. **FORMAT**: Output strictly a JSON array.
    
    ## Output Format (JSON Array ONLY):
    [
        {
            "title": "Paper/Thread Title",
            "authors": "Authors or Thread Author",
            "link": "URL",
            "tldr": "One sentence summary in Korean (Subjective & Casual style)",
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
                    { role: "user", content: "Check for the latest interesting papers/updates." }
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
