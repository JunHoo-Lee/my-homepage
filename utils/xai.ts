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

// --- Advanced Search Types & Logic ---

export type SearchMode = 'profile' | 'conference' | 'keyword' | 'related';

export interface SearchConfig {
    mode: SearchMode;
    // For 'conference'
    conferenceName?: string; // e.g., "ACL 2025", "EMNLP 2025"
    // For 'keyword'
    query?: string;
    dateLimit?: string; // e.g., "2024-01-01" or "3 months"
    // For 'related'
    targetPaperTitle?: string;
    targetPaperContext?: string; // Abstract or extra info
    // For 'profile' - uses default profile logic
    userProfile?: string;
    userInterests?: string[];
}

export async function performAdvancedSearch(config: SearchConfig): Promise<ScholarInboxItem[]> {
    if (!XAI_API_KEY) {
        console.error("Missing XAI_API_KEY");
        return [];
    }

    let systemPrompt = `You are an advanced AI Research Assistant. Your goal is to find high-quality academic papers based on specific criteria.`;
    let userMessage = "";

    // Tools handling: "x_search" (viral/social signal) and "web_search" (academic correctness)
    // We can tune instructions based on mode.

    const baseOutputFormat = `
    DATA FORMAT (JSON Array ONLY):
    [
        {
            "title": "Title",
            "authors": "Authors",
            "link": "URL",
            "tldr": "One sentence summary in Korean (Subjective & Casual style).",
            "relevance_reason": "One sentence explaining why this was chosen (Korean).",
            "source": "X" or "Web" or "Conference",
            "published_date": "YYYY-MM-DD"
        }
    ]`;

    switch (config.mode) {
        case 'conference':
            systemPrompt += `
            \nTASK: Find the topmost high-scoring/impactful papers from a specific conference.
            \nCRITERIA:
            1. Target Conference: "${config.conferenceName}"
            2. Prioritize: Award-winning papers (Best Paper, Outstanding), Oral presentations, or heavily discussed/cited papers from this venue.
            3. Randomness: If there are many good ones, randomly select a diverse set of 5-10 high-quality papers.
            4. USE TOOLS: Check official proceedings or trusted summaries via web_search. Check X discussions for "viral" papers from this conference.
            ${baseOutputFormat}
            `;
            userMessage = `Find top papers from ${config.conferenceName}.`;
            break;

        case 'keyword':
            systemPrompt += `
            \nTASK: Find papers on a specific topic with strict time filtering.
            \nCRITERIA:
            1. Topic: "${config.query}"
            2. Time Constraint: Published AFTER ${config.dateLimit || "recent times"}. STRICTLY ENFORCE THIS.
            3. Quality: Focus on novel, high-impact papers, not just any random upload.
            4. USE TOOLS: Use web_search for Arxiv/Scholar. Use x_search for recent threads.
            ${baseOutputFormat}
            `;
            userMessage = `Find papers on "${config.query}" published after ${config.dateLimit}.`;
            break;

        case 'related':
            systemPrompt += `
            \nTASK: Find research papers related to a specific target paper (Recursive Search).
            \nTARGET PAPER: "${config.targetPaperTitle}"
            ${config.targetPaperContext ? `Abstract/Context: ${config.targetPaperContext}` : ''}
            \nCRITERIA:
            1. Find papers that cite this paper, are cited by it, or solve the same problem with a different/better approach.
            2. Explain the relationship in "relevance_reason".
            3. Focus on *newer* or *complementary* work.
            ${baseOutputFormat}
            `;
            userMessage = `Find papers related to "${config.targetPaperTitle}".`;
            break;

        case 'profile':
            // Fallback to existing logic or similar
            // For now we might just wrap the original function or replicate logic.
            // Let's implement a simplified profile search here or defer.
            // But since the original function exists, we might not use this path often, 
            // OR we unify it. Let's stick to the specific requirements for now.
            systemPrompt += `
            \nTASK: Profile-based recommendation.
            \nInterests: ${config.userInterests?.join(', ')}
            \nProfile: ${config.userProfile}
            ${baseOutputFormat}
            `;
            userMessage = "Find papers fitting my profile.";
            break;
    }

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
                    { role: "user", content: userMessage }
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
            console.error("Grok Advanced Search API Error:", response.status, errorText);
            throw new Error(`Grok API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        // console.log("Grok Raw Response:", JSON.stringify(data, null, 2));

        // Parsing Logic (Reuse from performScholarSearch or similar)
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

        if (!content) {
            console.warn("Grok returned empty content in advanced search");
            return [];
        }

        const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
        console.log("Parsing Grok Content:", cleanJson.substring(0, 200) + "...");
        // Log start of content to check validity
        const parsed = JSON.parse(cleanJson);

        let rawItems: any[] = [];
        if (Array.isArray(parsed)) rawItems = parsed;
        else if (parsed.items && Array.isArray(parsed.items)) rawItems = parsed.items;

        const items: ScholarInboxItem[] = rawItems.filter((item: any) =>
            item && typeof item === 'object' && item.title
        );

        return items;

    } catch (e) {
        console.error("Advanced Search Failed:", e);
        return [];
    }
}

