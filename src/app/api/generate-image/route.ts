import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { apiKey, prompt, refImages } = await req.json();

        const finalApiKey = apiKey || process.env.GEMINI_API_KEY;

        if (!finalApiKey) {
            return NextResponse.json({ error: "API Key is required" }, { status: 400 });
        }

        const genAI = new GoogleGenerativeAI(finalApiKey);

        // Helper: Attempt generation with optimized fallback chain
        // We prioritize nano-banana-pro-preview as requested, then fallback to stable models
        const modelsToTry = ["nano-banana-pro-preview", "gemini-2.0-flash-exp", "gemini-1.5-flash", "gemini-1.5-pro"];

        let lastError = "";
        let result = null;

        for (const modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                let content: any[] = [prompt];
                if (refImages && Array.isArray(refImages)) {
                    refImages.forEach((img: any) => {
                        content.push({ inlineData: { data: img.data, mimeType: img.mimeType } });
                    });
                }
                result = await model.generateContent(content);
                if (result) break; // Success!
            } catch (e: any) {
                lastError = e.message;
                console.warn(`Model ${modelName} failed:`, lastError);
                // Continue to next model if it's a quota or availability issue
                if (lastError.toLowerCase().includes('quota') || lastError.toLowerCase().includes('429') || lastError.toLowerCase().includes('exhausted')) {
                    // Wait a bit before retry to avoid burst limit
                    await new Promise(r => setTimeout(r, 2000));
                    continue;
                } else {
                    break; // Critical error, stop
                }
            }
        }

        if (!result) {
            return NextResponse.json({ error: `全てのモデルで制限またはエラーが発生しました: ${lastError}` }, { status: 500 });
        }

        const response = await result.response;
        const candidates = await response.candidates;
        const firstPart = candidates?.[0]?.content?.parts?.[0];

        let returnData: any = {};

        if (firstPart?.inlineData) {
            returnData = {
                type: "image",
                mimeType: firstPart.inlineData.mimeType,
                data: firstPart.inlineData.data
            };
        } else if (firstPart?.text) {
            const text = firstPart.text;
            const svgMatch = text.match(/<svg[\s\S]*?<\/svg>/i);

            if (svgMatch) {
                let svgCode = svgMatch[0];
                if (!svgCode.includes('xmlns="http://www.w3.org/2000/svg"')) {
                    svgCode = svgCode.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
                }
                returnData = { type: "svg", content: svgCode };
            } else {
                returnData = { type: "text", content: text };
            }
        }

        return NextResponse.json(returnData);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
