import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

// Initialize Clients
const geminiApiKey = process.env.GEMINI_API_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

interface Example {
    input: string;
    output: string;
}

/**
 * Robust Text Generation
 * Tries Gemini first, falls back to OpenAI (gpt-4o-mini).
 */
export async function generateText(prompt: string): Promise<string | null> {
    // 1. Try Gemini
    if (genAI) {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            if (text) return text;
        } catch (error: any) {
            console.warn("Gemini Text Generation failed, attempting fallback:", error.message);
        }
    } else {
        console.warn("GEMINI_API_KEY not found.");
    }

    // 2. Fallback to OpenAI
    if (openai) {
        try {
            console.log("Falling back to OpenAI (gpt-4o-mini)...");
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 500, // Reasonable default
            });
            return response.choices[0]?.message?.content || null;
        } catch (error: any) {
            console.error("OpenAI Text Generation failed:", error.message);
        }
    } else {
        console.warn("OPENAI_API_KEY not found.");
    }

    return null;
}

/**
 * Robust JSON Generation
 * Tries Gemini first, falls back to OpenAI (gpt-4o-mini).
 * Ensures output is parsed JSON.
 */
export async function generateJSON(prompt: string): Promise<any | null> {
    // 1. Try Gemini
    if (genAI) {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Gemini 1.5 flash with responseMimeType usually returns clean JSON, but sometimes markdown blocks
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanText);
        } catch (error: any) {
            console.warn("Gemini JSON Generation failed, attempting fallback:", error.message);
        }
    }

    // 2. Fallback to OpenAI
    if (openai) {
        try {
            console.log("Falling back to OpenAI (gpt-4o-mini) for JSON...");
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "You are a helpful assistant that outputs strictly valid JSON." },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" }
            });
            const content = response.choices[0]?.message?.content;
            if (content) return JSON.parse(content);
        } catch (error: any) {
            console.error("OpenAI JSON Generation failed:", error.message);
        }
    }

    return null;
}
