import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { apiKey, prompt, refImages } = await req.json(); // refImages: array of {data: base64, mimeType: string}

        const finalApiKey = apiKey || process.env.GEMINI_API_KEY;

        if (!finalApiKey) {
            return NextResponse.json({ error: "API Key is required" }, { status: 400 });
        }

        const genAI = new GoogleGenerativeAI(finalApiKey);

        // Helper to attempt generation with a specific model
        const tryGenerate = async (modelName: string) => {
            const model = genAI.getGenerativeModel({ model: modelName });
            let content: any[] = [prompt];
            if (refImages && Array.isArray(refImages)) {
                refImages.forEach((img: any) => {
                    content.push({
                        inlineData: {
                            data: img.data,
                            mimeType: img.mimeType
                        }
                    });
                });
            }
            const result = await model.generateContent(content);
            return result;
        };

        let result;
        try {
            // Plan A: Nano Banana Pro (Experimental/High Quality)
            result = await tryGenerate("nano-banana-pro-preview");
        } catch (e: any) {
            const msg = e.message.toLowerCase();
            console.warn("Primary image model failed, trying fallback:", msg);

            // Plan B: Fallback to Stable Models if quota or model name issue
            if (msg.includes('quota') || msg.includes('429') || msg.includes('exhausted') || msg.includes('not found') || msg.includes('valid')) {
                try {
                    // Try 1.5 Pro first
                    result = await tryGenerate("gemini-1.5-pro");
                } catch (e2) {
                    // Finally try 1.5 Flash (Highest quota)
                    result = await tryGenerate("gemini-1.5-flash");
                }
            } else {
                throw e;
            }
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
        };

        return NextResponse.json(returnData);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
