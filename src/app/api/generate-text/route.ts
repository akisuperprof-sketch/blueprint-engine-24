import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { apiKey, prompt, image, mimeType } = await req.json();

        const finalApiKey = apiKey || process.env.GEMINI_API_KEY;

        if (!finalApiKey) {
            return NextResponse.json({ error: "API Key is required" }, { status: 400 });
        }

        const genAI = new GoogleGenerativeAI(finalApiKey);

        // Requested priority: 3-flash (user wish) -> 3-pro -> 2.0-flash (best exp) -> 1.5-pro (capable) -> 1.5-flash (stable/fast)
        const modelsToTry = ["gemini-3-flash", "gemini-3-pro-preview", "gemini-2.0-flash-exp", "gemini-1.5-pro", "gemini-1.5-flash"];

        let lastError = "";
        let text = "";

        for (const modelName of modelsToTry) {
            try {
                console.log(`[Text] Starting generation with model: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });

                let content: any[] = [prompt];
                if (image && mimeType) {
                    content.push({ inlineData: { data: image, mimeType: mimeType } });
                }

                // 20s timeout for text
                const generatePromise = model.generateContent(content);
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error(`Timeout with ${modelName}`)), 30000)
                );

                const result = await Promise.race([generatePromise, timeoutPromise]) as any;
                const response = await result.response;
                text = response.text();

                if (text) {
                    console.log(`[Text] Success with model: ${modelName}`);
                    break;
                }
            } catch (e: any) {
                lastError = e.message;
                console.warn(`[Text] Model ${modelName} failed:`, lastError);

                // If quota or not found, continue. If severe, maybe stop? For now, continue on all errors to be safe.
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }
        }

        if (!text) {
            throw new Error(`All text models failed. Last error: ${lastError}`);
        }

        return NextResponse.json({ text });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
