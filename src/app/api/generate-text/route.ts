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

        // --- Primary Model Call ---
        let text = "";
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
            let content: any[] = [prompt];
            if (image && mimeType) {
                content.push({ inlineData: { data: image, mimeType: mimeType } });
            }
            const result = await model.generateContent(content);
            const response = await result.response;
            text = response.text();
        } catch (primaryError: any) {
            console.error("Primary text model failed, trying fallback:", primaryError.message);
            // --- Fallback Model Call (Gemini 1.5 Flash is more stable and has higher quota) ---
            if (primaryError.message.toLowerCase().includes('quota') || primaryError.message.toLowerCase().includes('429') || primaryError.message.toLowerCase().includes('exhausted')) {
                const fallbackModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                let content: any[] = [prompt];
                if (image && mimeType) {
                    content.push({ inlineData: { data: image, mimeType: mimeType } });
                }
                const result = await fallbackModel.generateContent(content);
                const response = await result.response;
                text = response.text();
            } else {
                throw primaryError;
            }
        }

        return NextResponse.json({ text });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
